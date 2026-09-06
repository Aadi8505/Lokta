/**
 * verdict.ts — Borrow / Don't Borrow / Borrow Less decision engine.
 *
 * Every verdict is rules-driven — no hard-coding per borrower.
 * The engine evaluates all conditions and produces a decision with
 * a traceable reason tied to the borrower's answers.
 *
 * Special handling for Anita-like profiles: when existing high-cost debt
 * exists, "Don't borrow yet" includes an actionable debt-first recommendation.
 */

import {
  FOIR_HARD_CEILING,
  FOIR_WARNING_ZONE,
  PRODUCT_CONFIG,
  SAVINGS_THRESHOLDS,
} from './rules';
import type { BorrowerAnswers, Verdict } from './types';
import {
  getEffectiveIncome,
  calculateFOIR,
  getSafeEmiCeiling,
  hasHighCostDebt,
  getStressedSafeEmi,
} from './affordability';
import { calculateEMI } from './emiCalculator';
import { getRateBand } from './rateEngine';
import { calculateConfidence } from './confidence';
import { getApplicableProducts } from './eligibility';

/**
 * Generate the O1 verdict: Borrow / Borrow Less / Don't Borrow.
 *
 * Checks are evaluated in order of severity:
 * 1. Hard stops (Don't borrow)
 * 2. Caution flags (Borrow less)
 * 3. Clear to borrow
 */
export function generateVerdict(answers: BorrowerAnswers): Verdict {
  const details: string[] = [];
  const { actualIncome } = getEffectiveIncome(answers);
  const existingEmis = answers.existingEmis ?? 0;
  const amountWanted = answers.amountWanted ?? 0;

  // Get applicable product to calculate likely EMI
  const products = getApplicableProducts(answers);
  
  // Select primary product for evaluation:
  // If user specified preferredProduct, evaluate that.
  // Otherwise, if multiple options exist (e.g. unsecured vs secured options),
  // check if default product exceeds FOIR hard ceiling while an alternative (e.g. LAP or secured business) is viable.
  let primaryProduct = answers.preferredProduct && products.includes(answers.preferredProduct)
    ? answers.preferredProduct
    : products[0];

  if (!answers.preferredProduct && products.length > 1) {
    const evalEmi = (prod: LoanProduct) => {
      const cfg = PRODUCT_CONFIG[prod];
      const tenure = cfg.typicalTenureMonths[Math.floor(cfg.typicalTenureMonths.length / 2)];
      const rb = getRateBand(answers, prod, tenure, amountWanted);
      const mr = (rb.nominalRate[0] + rb.nominalRate[1]) / 2;
      return calculateEMI(amountWanted, mr, tenure);
    };

    const { projectedFoir: defaultFoir } = calculateFOIR(actualIncome, existingEmis, evalEmi(primaryProduct));

    if (defaultFoir > FOIR_HARD_CEILING) {
      for (const alt of products) {
        if (alt === primaryProduct) continue;
        const { projectedFoir: altFoir } = calculateFOIR(actualIncome, existingEmis, evalEmi(alt));
        if (altFoir <= FOIR_HARD_CEILING) {
          primaryProduct = alt;
          details.push(
            `An unsecured loan of ₹${amountWanted.toLocaleString('en-IN')} would stretch your monthly obligations too high. However, using your collateral for ${PRODUCT_CONFIG[alt].secured ? 'a secured loan / LAP' : alt} brings the EMI into a viable range.`
          );
          break;
        }
      }
    }
  }

  const config = PRODUCT_CONFIG[primaryProduct];
  const typicalTenure = config.typicalTenureMonths[Math.floor(config.typicalTenureMonths.length / 2)];

  const rateBand = getRateBand(answers, primaryProduct, typicalTenure, amountWanted);
  const midRate = (rateBand.nominalRate[0] + rateBand.nominalRate[1]) / 2;
  const projectedEmi = calculateEMI(amountWanted, midRate, typicalTenure);

  // FOIR calculation
  const { currentFoir, projectedFoir } = calculateFOIR(actualIncome, existingEmis, projectedEmi);
  const { safeEmi } = getSafeEmiCeiling(answers);
  const stressedSafeEmi = getStressedSafeEmi(answers);

  // ─── DON'T BORROW checks ───────────────────────────────────────────

  // Check 1: FOIR hard ceiling
  if (projectedFoir > FOIR_HARD_CEILING) {
    return buildVerdict('dont_borrow',
      `Your total EMI obligations would reach ${(projectedFoir * 100).toFixed(0)}% of income — well above the safe limit of ${(FOIR_HARD_CEILING * 100)}%. This is too risky.`,
      details, answers);
  }

  // Check 2: High-cost existing debt + seeking more unsecured debt
  const highCostDebt = hasHighCostDebt(answers);
  if (highCostDebt.hasHighCost) {
    const hasBouncedEmi = (answers.emiBounces ?? 0) > 0;

    if (hasBouncedEmi) {
      // Anita-like profile: existing high-cost debt + bounced EMI
      return buildVerdict('dont_borrow',
        `You have existing debt at ${highCostDebt.rate}%+ with a recent EMI bounce. Taking on more debt now would deepen the problem.`,
        [
          highCostDebt.recommendation!,
          `Priority: Clear or restructure the ₹${highCostDebt.outstanding?.toLocaleString('en-IN')} high-cost debt first.`,
          `If you need the loan urgently, look into a gold loan (if you have gold) or an employer advance — both are cheaper than app loans at 30%+.`,
          `Once existing debt is cleared, your borrowing capacity and rate improve significantly.`,
        ],
        answers,
        highCostDebt.recommendation);
    }

    // High-cost debt but no bounces — still concerning
    details.push(highCostDebt.recommendation!);
  }

  // Check 3: Bounced EMI + unsecured new debt
  if ((answers.emiBounces ?? 0) > 0 && !config.secured) {
    const bounceCount = answers.emiBounces!;
    if (bounceCount >= 2) {
      return buildVerdict('dont_borrow',
        `${bounceCount} EMI bounces in the last year signals cash-flow stress. Lenders will likely reject unsecured applications, and taking more debt now is risky.`,
        [
          'Focus on stabilising your current repayments first.',
          'If you need funds urgently, explore a secured option (gold loan, etc.) with lower rates.',
        ],
        answers);
    }
  }

  // Check 4: Very low savings + no collateral + high current FOIR
  if (answers.emergencySavingsMonths !== undefined &&
      answers.emergencySavingsMonths < SAVINGS_THRESHOLDS.critical &&
      !answers.collateralAvailable &&
      currentFoir > 0.40) {
    return buildVerdict('dont_borrow',
      `With less than 1 month of emergency savings, no collateral, and ${(currentFoir * 100).toFixed(0)}% of income already committed to EMIs, a new loan creates unacceptable risk.`,
      ['Build up at least 2-3 months of emergency savings before borrowing.'],
      answers);
  }

  // Check 5: New EMI unaffordable even at max tenure
  if (safeEmi <= 0) {
    return buildVerdict('dont_borrow',
      'After your existing obligations and expenses, there is no room for additional EMI without financial strain.',
      ['Reduce expenses or increase income before considering a loan.'],
      answers);
  }

  // ─── BORROW LESS checks ────────────────────────────────────────────

  const borrowLessReasons: string[] = [];

  // Check 1: FOIR in warning zone
  if (projectedFoir > FOIR_WARNING_ZONE) {
    borrowLessReasons.push(
      `Your total EMI would be ${(projectedFoir * 100).toFixed(0)}% of income — in the warning zone (${(FOIR_WARNING_ZONE * 100)}–${(FOIR_HARD_CEILING * 100)}%).`
    );
  }

  // Check 2: Requested exceeds safe carry
  const safeAmount = safeEmi > 0
    ? Math.round(safeEmi * ((Math.pow(1 + midRate / 100 / 12, typicalTenure) - 1) / ((midRate / 100 / 12) * Math.pow(1 + midRate / 100 / 12, typicalTenure))))
    : 0;

  if (amountWanted > safeAmount * 1.1) { // 10% tolerance
    borrowLessReasons.push(
      `You want ₹${amountWanted.toLocaleString('en-IN')} but can safely carry ₹${safeAmount.toLocaleString('en-IN')}. Consider borrowing the lower amount.`
    );
  }

  // Check 3: Low emergency savings
  if (answers.emergencySavingsMonths !== undefined &&
      answers.emergencySavingsMonths < SAVINGS_THRESHOLDS.low) {
    borrowLessReasons.push(
      `With only ${answers.emergencySavingsMonths} month(s) of emergency savings, a smaller loan reduces your risk.`
    );
  }

  // Check 4: Stressed EMI unaffordable
  if (projectedEmi > stressedSafeEmi) {
    borrowLessReasons.push(
      `If your income drops 20%, this EMI becomes unaffordable. A smaller amount keeps you safe under stress.`
    );
  }

  // Check 5: Single bounced EMI (not enough for Don't, but warrants caution)
  if ((answers.emiBounces ?? 0) === 1) {
    borrowLessReasons.push(
      `One EMI bounce in the last year suggests occasional cash-flow tightness. A smaller loan provides more breathing room.`
    );
  }

  // Check 6: High-cost debt without bounces
  if (highCostDebt.hasHighCost && (answers.emiBounces ?? 0) === 0) {
    borrowLessReasons.push(
      `Consider using part of this loan to refinance your ${highCostDebt.rate}%+ debt, or borrow less so total EMI stays manageable.`
    );
  }

  if (borrowLessReasons.length > 0) {
    const primaryReason = borrowLessReasons[0];
    return buildVerdict('borrow_less', primaryReason, borrowLessReasons, answers,
      highCostDebt.hasHighCost ? highCostDebt.recommendation : undefined);
  }

  // ─── BORROW (clear) ───────────────────────────────────────────────

  const positives: string[] = [];
  if (projectedFoir < 0.40) {
    positives.push(`Your total EMI stays at ${(projectedFoir * 100).toFixed(0)}% of income — well within comfortable limits.`);
  } else {
    positives.push(`Your total EMI would be ${(projectedFoir * 100).toFixed(0)}% of income — within manageable limits.`);
  }

  if (answers.emergencySavingsMonths !== undefined && answers.emergencySavingsMonths >= SAVINGS_THRESHOLDS.adequate) {
    positives.push(`You have ${answers.emergencySavingsMonths} months of emergency savings as a buffer.`);
  }

  if (projectedEmi <= stressedSafeEmi) {
    positives.push(`Even if your income drops 20%, this EMI remains affordable.`);
  }

  if (answers.loanWillGenerateIncome) {
    positives.push(`This is a productive loan expected to generate additional income, which supports borrowing.`);
  }

  return buildVerdict('borrow',
    positives[0],
    positives,
    answers);
}

function buildVerdict(
  decision: 'borrow' | 'borrow_less' | 'dont_borrow',
  reason: string,
  details: string[],
  answers: BorrowerAnswers,
  debtFirstRecommendation?: string
): Verdict {
  const conf = calculateConfidence(answers, 'verdict');
  return {
    decision,
    reason,
    details,
    debtFirstRecommendation,
    confidenceLevel: conf.level,
    confidenceExplanation: conf.explanation,
  };
}
