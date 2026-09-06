/**
 * eligibility.ts — Lender-likely sanction amount and safe-carry amount.
 *
 * Two numbers, always clearly separated:
 * 1. What a lender will likely approve (FOIR-based, using lender income)
 * 2. What the borrower can safely carry (expense-based, using actual income)
 *
 * Recommends the lower with clear reasoning.
 */

import {
  FOIR_CAPS,
  PRODUCT_CONFIG,
  PURPOSE_TO_PRODUCTS,
  type LoanProduct,
  type IncomeType,
} from './rules';
import type { BorrowerAnswers, Eligibility, ProductRecommendation } from './types';
import {
  getEffectiveIncome,
  getMaxLenderEmi,
  getSafeEmiCeiling,
} from './affordability';
import { maxPrincipalForEmi } from './emiCalculator';
import { getRateBand } from './rateEngine';
import { calculateConfidence, widenRange } from './confidence';

/**
 * Determine which loan products are applicable.
 * Does NOT auto-prescribe a single product — recommends comparing when
 * multiple options exist (e.g., secured vs unsecured for Ravi).
 */
export function getApplicableProducts(
  answers: BorrowerAnswers
): LoanProduct[] {
  const purpose = answers.loanPurpose ?? 'other';
  const baseProducts = (PURPOSE_TO_PRODUCTS as Record<string, LoanProduct[]>)[purpose] ?? ['personal'];
  let products = [...baseProducts];

  // If borrower specified a preference, prioritize it but keep others
  if (answers.preferredProduct && !products.includes(answers.preferredProduct)) {
    products.unshift(answers.preferredProduct);
  }

  // If collateral is available and amount is significant,
  // add secured options for comparison (don't auto-prescribe)
  if (answers.collateralAvailable && answers.collateralValue) {
    if (!products.includes('lap') && !products.includes('gold')) {
      // Add LAP for comparison if property collateral
      if (answers.collateralValue >= 5_00_000) {
        products.push('lap');
      }
    }
    if (!products.includes('business_secured') &&
        (purpose === 'business_expansion' || purpose === 'business_vehicle')) {
      products.push('business_secured');
    }
  }

  // If collateral is explicitly NOT available or absent, remove products that strictly require property/asset collateral
  if (answers.collateralAvailable === false || (!answers.collateralAvailable && !answers.collateralValue)) {
    products = products.filter(p => p !== 'lap' && p !== 'business_secured');
  }

  // Filter out products where amount exceeds product max
  const amount = answers.amountWanted ?? 0;
  products = products.filter(p => {
    const config = PRODUCT_CONFIG[p];
    if (!config) return false;
    return amount <= config.maxAmount && amount >= config.minAmount;
  });

  return products.length > 0 ? products : ['personal']; // Fallback
}

/**
 * Calculate lender-likely sanction for a specific product.
 */
function calculateLenderAmount(
  answers: BorrowerAnswers,
  product: LoanProduct
): [number, number] {
  const incomeType = answers.incomeType ?? 'salaried';
  const { lenderIncome } = getEffectiveIncome(answers);
  const existingEmis = answers.existingEmis ?? 0;
  const config = PRODUCT_CONFIG[product];

  // Get rate band midpoint for PV calculation
  const typicalTenure = config.typicalTenureMonths[Math.floor(config.typicalTenureMonths.length / 2)];
  const rateBand = getRateBand(answers, product, typicalTenure, answers.amountWanted ?? 0);
  const rateLow = rateBand.nominalRate[0];
  const rateHigh = rateBand.nominalRate[1];

  // Max EMI lender would allow
  const maxEmi = getMaxLenderEmi(lenderIncome, existingEmis, incomeType);

  // Convert to max principal at each end of rate band
  const maxTenure = getMaxTenureForAge(answers.age, config.maxTenureMonths);
  const amountHigh = maxPrincipalForEmi(maxEmi, rateLow, maxTenure);
  const amountLow = maxPrincipalForEmi(maxEmi, rateHigh, maxTenure);

  // Apply LTV cap for secured products
  let ltvCap = Infinity;
  if (config.secured && config.maxLTV > 0 && answers.collateralValue) {
    ltvCap = answers.collateralValue * config.maxLTV;
  }

  // Apply product amount cap
  const capLow = Math.min(amountLow, config.maxAmount, ltvCap);
  const capHigh = Math.min(amountHigh, config.maxAmount, ltvCap);

  // Co-applicant income boost
  let boost = 1.0;
  if (answers.coApplicantAvailable && answers.coApplicantIncome) {
    // Co-applicant income adds to effective income, typically at 50% weighting
    const coApplicantContribution = answers.coApplicantIncome * 0.5;
    const totalIncome = lenderIncome + coApplicantContribution;
    boost = totalIncome / Math.max(lenderIncome, 1);
  }

  return [
    Math.round(Math.max(0, capLow * boost)),
    Math.round(Math.max(0, capHigh * boost)),
  ];
}

/**
 * Get max tenure adjusted for age.
 * Most products require loan to end by age 60 (salaried) or 65 (self-employed).
 */
function getMaxTenureForAge(age: number | undefined, productMaxTenure: number): number {
  if (!age) return productMaxTenure;
  const retirementAge = 60;
  const yearsToRetirement = Math.max(0, retirementAge - age);
  const monthsToRetirement = yearsToRetirement * 12;
  return Math.min(productMaxTenure, monthsToRetirement);
}

/**
 * Calculate safe-carry amount for a specific product.
 */
function calculateSafeAmount(
  answers: BorrowerAnswers,
  product: LoanProduct
): [number, number] {
  const config = PRODUCT_CONFIG[product];
  const { safeEmi } = getSafeEmiCeiling(answers);

  const maxTenure = getMaxTenureForAge(answers.age, config.maxTenureMonths);
  const rateBand = getRateBand(answers, product, maxTenure, answers.amountWanted ?? 0);

  const amountHigh = maxPrincipalForEmi(safeEmi, rateBand.nominalRate[0], maxTenure);
  const amountLow = maxPrincipalForEmi(safeEmi, rateBand.nominalRate[1], maxTenure);

  // Apply LTV cap for secured
  let ltvCap = Infinity;
  if (config.secured && config.maxLTV > 0 && answers.collateralValue) {
    ltvCap = answers.collateralValue * config.maxLTV;
  }

  return [
    Math.round(Math.max(0, Math.min(amountLow, config.maxAmount, ltvCap))),
    Math.round(Math.max(0, Math.min(amountHigh, config.maxAmount, ltvCap))),
  ];
}

/**
 * Build full eligibility assessment with product comparison.
 */
export function calculateEligibility(answers: BorrowerAnswers): Eligibility {
  const products = getApplicableProducts(answers);
  const amountWanted = answers.amountWanted ?? 0;

  const productRecs: ProductRecommendation[] = products.map(product => {
    const config = PRODUCT_CONFIG[product];
    const lenderAmount = calculateLenderAmount(answers, product);
    const safeAmount = calculateSafeAmount(answers, product);
    const typicalTenure = config.typicalTenureMonths[Math.floor(config.typicalTenureMonths.length / 2)];
    const rateBand = getRateBand(answers, product, typicalTenure, amountWanted);

    // Is borrower eligible?
    const eligible = lenderAmount[1] >= amountWanted * 0.5; // At least 50% of wanted

    // Build reason
    let reason: string;
    if (!eligible) {
      reason = `Your income supports up to ₹${lenderAmount[1].toLocaleString('en-IN')} for ${formatProductName(product)}, which is below your requirement.`;
    } else if (safeAmount[1] < amountWanted) {
      reason = `A lender may approve ₹${amountWanted.toLocaleString('en-IN')}, but you can safely carry up to ₹${safeAmount[1].toLocaleString('en-IN')} for ${formatProductName(product)}.`;
    } else {
      reason = `You're eligible and can safely carry ₹${amountWanted.toLocaleString('en-IN')} as a ${formatProductName(product)}.`;
    }

    // Note for comparison
    let note: string | undefined;
    if (products.length > 1 && config.secured) {
      note = `Compare this secured option — the rate could be significantly lower than an unsecured loan.`;
    }

    return {
      product,
      label: formatProductName(product),
      eligible,
      reason,
      lenderAmount,
      safeAmount,
      rateBand: rateBand.nominalRate,
      note,
    };
  });

  // Overall amounts (from primary product or best option that safely covers the amount)
  const primary = productRecs.find(r => r.eligible && r.safeAmount[1] >= amountWanted)
    ?? productRecs.find(r => r.eligible)
    ?? productRecs[0];

  // Apply confidence widening
  const conf = calculateConfidence(answers, 'eligibility');
  const lenderAmount = widenRange(primary.lenderAmount, conf.widenPct);
  const safeAmount = widenRange(primary.safeAmount, conf.widenPct);

  // Recommendation: always use the lower (safe) amount
  const recommendedAmount = Math.min(safeAmount[1], amountWanted);
  let recommendationReason: string;
  if (safeAmount[1] >= amountWanted) {
    recommendationReason = `Your requested amount of ₹${amountWanted.toLocaleString('en-IN')} is within your safe carrying capacity.`;
  } else if (lenderAmount[1] >= amountWanted) {
    recommendationReason = `A lender may approve ₹${amountWanted.toLocaleString('en-IN')}, but based on your actual expenses you can safely carry ₹${safeAmount[1].toLocaleString('en-IN')}. Use the lower number.`;
  } else {
    recommendationReason = `Based on your income and obligations, you're eligible for up to ₹${lenderAmount[1].toLocaleString('en-IN')}. This is below your requested ₹${amountWanted.toLocaleString('en-IN')}.`;
  }

  // Explanations for key numbers
  const { explanation: incomeExpl } = getEffectiveIncome(answers);
  const { explanation: safeExpl } = getSafeEmiCeiling(answers);

  const explanations: Record<string, string> = {
    lenderAmount: `${incomeExpl}. With FOIR cap of ${(getFoirCapForType(answers.incomeType ?? 'salaried') * 100)}%, your max lender EMI drives this number.`,
    safeAmount: safeExpl,
    recommendedAmount: recommendationReason,
  };

  return {
    lenderLikelyAmount: lenderAmount,
    safeCarryAmount: safeAmount,
    recommendedAmount,
    recommendationReason,
    applicableProducts: productRecs,
    confidenceLevel: conf.level,
    confidenceExplanation: conf.explanation,
    explanations,
  };
}

function getFoirCapForType(incomeType: IncomeType): number {
  return FOIR_CAPS[incomeType].lender;
}

function formatProductName(product: LoanProduct): string {
  const names: Record<LoanProduct, string> = {
    personal: 'Personal Loan',
    home: 'Home Loan',
    lap: 'Loan Against Property (LAP)',
    gold: 'Gold Loan',
    two_wheeler: 'Two-Wheeler Loan',
    business_unsecured: 'Business Loan (Unsecured)',
    business_secured: 'Business Loan (Secured)',
  };
  return names[product];
}
