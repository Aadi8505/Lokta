/**
 * assessment.ts — Main orchestrator that runs all four outputs.
 *
 * Takes borrower answers and produces the full assessment:
 * O1 (Verdict), O2 (Eligibility), O3 (Rate), O4 (EMI),
 * plus Negotiation Card and optional Lender Comparison.
 */

import { PRODUCT_CONFIG, PROCESSING_FEE_RANGE, type LoanProduct } from './rules';
import type {
  BorrowerAnswers,
  FullAssessment,
  EMIResult,
  NegotiationCardData,
} from './types';
import { generateVerdict } from './verdict';
import { calculateEligibility, getApplicableProducts } from './eligibility';
import { getRateBand, scoreToBand, scoreBandLabel } from './rateEngine';
import {
  calculateEMI,
  tenureTradeoff,
  stressTest,
} from './emiCalculator';
import { getSafeEmiCeiling, getStressedSafeEmi } from './affordability';
import { calculateConfidence } from './confidence';
import { compareLenderOffer } from './lenderComparison';

/**
 * Run the full assessment for a borrower.
 */
export function runAssessment(answers: BorrowerAnswers): FullAssessment {
  const warnings: string[] = [];

  // Determine primary product
  const products = getApplicableProducts(answers);
  const primaryProduct = products[0];
  const config = PRODUCT_CONFIG[primaryProduct];
  const amountWanted = answers.amountWanted ?? 0;

  // Pick a reasonable tenure for calculations
  const typicalTenure = config.typicalTenureMonths[
    Math.floor(config.typicalTenureMonths.length / 2)
  ];

  // O1: Verdict
  const verdict = generateVerdict(answers);

  // O2: Eligibility
  const eligibility = calculateEligibility(answers);

  // O3: Rate band
  const rateBand = getRateBand(answers, primaryProduct, typicalTenure, amountWanted);

  // O4: EMI
  const { safeEmi } = getSafeEmiCeiling(answers);
  const stressedSafe = getStressedSafeEmi(answers);
  const midRate = (rateBand.nominalRate[0] + rateBand.nominalRate[1]) / 2;

  // Use the lesser of requested and safe amount for EMI calc
  const emiPrincipal = Math.min(amountWanted, eligibility.safeCarryAmount[1] || amountWanted);

  const tradeoff = tenureTradeoff(emiPrincipal, midRate, primaryProduct, safeEmi);
  const recommended = tradeoff.find(t => t.isRecommended) ?? tradeoff[tradeoff.length - 1];
  const recommendedTenure = recommended?.tenureMonths ?? typicalTenure;

  const stress = stressTest(
    emiPrincipal,
    midRate,
    recommendedTenure,
    safeEmi,
    stressedSafe
  );

  const emiConf = calculateConfidence(answers, 'emi');

  const emiResult: EMIResult = {
    recommendedTenureMonths: recommendedTenure,
    emiCeiling: Math.round(safeEmi),
    emiCeilingReason: buildEmiCeilingReason(answers, safeEmi),
    tenureOptions: tradeoff,
    stressTest: stress,
    confidenceLevel: emiConf.level,
    confidenceExplanation: emiConf.explanation,
  };

  // Lender comparison (if offer provided)
  const lenderComparison = compareLenderOffer(answers, rateBand, amountWanted);

  // Negotiation Card
  const negotiationCard = buildNegotiationCard(
    answers, verdict, eligibility, rateBand, emiResult, lenderComparison
  );

  // Collect warnings
  if (verdict.decision === 'dont_borrow' && amountWanted > 0) {
    warnings.push('Our assessment recommends not borrowing at this time. See the verdict for details.');
  }
  if (eligibility.lenderLikelyAmount[1] < amountWanted * 0.8) {
    warnings.push('Your requested amount may exceed what lenders will approve.');
  }
  if (rateBand.unknownFactors.length > 0) {
    warnings.push('Some rate factors are unknown — your actual rate could differ.');
  }

  return {
    verdict,
    eligibility,
    rateBand,
    emiResult,
    negotiationCard,
    lenderComparison: lenderComparison ?? undefined,
    warnings,
  };
}

function buildEmiCeilingReason(answers: BorrowerAnswers, safeEmi: number): string {
  const { explanation } = getSafeEmiCeiling(answers);
  return `Your safe EMI ceiling is ₹${Math.round(safeEmi).toLocaleString('en-IN')}/month. ${explanation}`;
}

function buildNegotiationCard(
  answers: BorrowerAnswers,
  verdict: ReturnType<typeof generateVerdict>,
  eligibility: ReturnType<typeof calculateEligibility>,
  rateBand: ReturnType<typeof getRateBand>,
  emiResult: EMIResult,
  lenderComparison: ReturnType<typeof compareLenderOffer>
): NegotiationCardData {
  const scoreBand = scoreToBand(answers.creditScore);

  const incomeTypeLabel: Record<string, string> = {
    salaried: 'Salaried',
    self_employed: 'Self-employed',
    informal: 'Informal/Gig',
  };

  // Build lender questions based on context
  const lenderQuestions = [
    'What is the total APR including all fees? (Not just the nominal rate)',
    'Is the rate fixed or floating? If floating, what is the reset frequency?',
    'Is there a prepayment or foreclosure penalty?',
  ];

  const feeRange = Object.values(PROCESSING_FEE_RANGE)[0]; // Default
  lenderQuestions.push(
    `What is the processing fee? (Fair range for your product: ${rateBand.processingFee[0]}–${rateBand.processingFee[1]}%)`
  );

  if (eligibility.applicableProducts.length > 1) {
    lenderQuestions.push('Can I get a secured loan (e.g., against property) for a better rate?');
  }

  // Comparison note
  let comparisonNote: string | undefined;
  if (lenderComparison) {
    comparisonNote = lenderComparison.explanation;
  }

  // Verdict label
  const verdictLabels: Record<string, string> = {
    borrow: '✓ Clear to borrow',
    borrow_less: '⚠ Consider borrowing less',
    dont_borrow: '✗ Not recommended right now',
  };

  // Stress summary
  let stressSummary: string;
  if (emiResult.stressTest.rateRiseStillAffordable && emiResult.stressTest.incomeDropStillAffordable) {
    stressSummary = 'Even if rates rise 2% or income drops 20%, this EMI stays affordable.';
  } else if (emiResult.stressTest.rateRiseStillAffordable) {
    stressSummary = `Rate-rise safe, but if income drops 20%, EMI becomes tight (stressed ceiling: ₹${Math.round(emiResult.stressTest.incomeDropSafeEmi).toLocaleString('en-IN')}).`;
  } else if (emiResult.stressTest.incomeDropStillAffordable) {
    stressSummary = `Income-drop safe, but if rates rise 2%, EMI jumps to ₹${emiResult.stressTest.rateRiseEmi.toLocaleString('en-IN')} — above your current ceiling.`;
  } else {
    stressSummary = `Caution: neither a 2% rate rise nor a 20% income drop is fully covered at this EMI level.`;
  }

  return {
    generatedDate: new Date().toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    }),
    profile: {
      incomeType: incomeTypeLabel[answers.incomeType ?? 'salaried'],
      age: answers.age,
      scoreBand: scoreBandLabel(scoreBand),
    },
    verdict: {
      decision: verdictLabels[verdict.decision],
      reason: verdict.reason,
    },
    safeAmount: eligibility.safeCarryAmount,
    lenderAmount: eligibility.lenderLikelyAmount,
    amountAdvice: eligibility.recommendationReason,
    fairRate: rateBand.nominalRate,
    fairAPR: rateBand.apr,
    rateReason: rateBand.explanation,
    emiCeiling: emiResult.emiCeiling,
    emiCeilingReason: emiResult.emiCeilingReason,
    stressSummary,
    lenderQuestions,
    comparisonNote,
  };
}
