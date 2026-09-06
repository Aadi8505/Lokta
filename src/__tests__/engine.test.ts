/**
 * engine.test.ts — Comprehensive boundary tests for the Borrower Copilot engine.
 *
 * Covers: FOIR limits, unknowns, high-cost debt, bounced EMI, collateral/LTV,
 * APR cash-flow, productive loans, and all three borrower profiles.
 */

import { describe, it, expect } from 'vitest';
import { calculateEMI, maxPrincipalForEmi, calculateAPR, totalInterest } from '../engine/emiCalculator';
import { calculateFOIR, getEffectiveIncome, getSafeEmiCeiling, hasHighCostDebt } from '../engine/affordability';
import { getRateBand, scoreToBand } from '../engine/rateEngine';
import { calculateEligibility, getApplicableProducts } from '../engine/eligibility';
import { generateVerdict } from '../engine/verdict';
import { calculateConfidence } from '../engine/confidence';
import { runAssessment } from '../engine/assessment';
import { compareLenderOffer } from '../engine/lenderComparison';
import { FOIR_CAPS, RATE_GRID } from '../engine/rules';
import type { BorrowerAnswers } from '../engine/types';

// ═══ EMI CALCULATOR ═══════════════════════════════════════════════════════

describe('EMI Calculator', () => {
  it('calculates EMI for standard inputs', () => {
    // ₹10L at 12% for 36 months → EMI ≈ ₹33,214
    const emi = calculateEMI(10_00_000, 12, 36);
    expect(emi).toBeGreaterThan(33_000);
    expect(emi).toBeLessThan(34_000);
  });

  it('returns 0 for zero principal', () => {
    expect(calculateEMI(0, 12, 36)).toBe(0);
  });

  it('returns 0 for zero tenure', () => {
    expect(calculateEMI(10_00_000, 12, 0)).toBe(0);
  });

  it('handles zero interest rate', () => {
    // 0% rate → EMI = principal / tenure
    const emi = calculateEMI(12_000, 0, 12);
    expect(emi).toBe(1000);
  });

  it('inverse: maxPrincipalForEmi recovers principal', () => {
    const emi = calculateEMI(5_00_000, 10, 60);
    const recoveredPrincipal = maxPrincipalForEmi(emi, 10, 60);
    // Should be close to original (within rounding)
    expect(Math.abs(recoveredPrincipal - 5_00_000)).toBeLessThan(100);
  });

  it('total interest is positive for non-zero rate', () => {
    const interest = totalInterest(10_00_000, 12, 36);
    expect(interest).toBeGreaterThan(0);
  });

  it('total interest is zero for zero rate', () => {
    const interest = totalInterest(12_000, 0, 12);
    expect(interest).toBe(0);
  });
});

// ═══ APR CALCULATION ══════════════════════════════════════════════════════

describe('APR (IRR-based)', () => {
  it('APR equals nominal rate when processing fee is 0', () => {
    const apr = calculateAPR(10_00_000, 12, 36, 0);
    // Should be very close to 12%
    expect(Math.abs(apr - 12)).toBeLessThan(0.1);
  });

  it('APR is higher than nominal rate when processing fee > 0', () => {
    const apr = calculateAPR(10_00_000, 12, 36, 2);
    // APR must exceed 12% because of the fee
    expect(apr).toBeGreaterThan(12);
  });

  it('APR difference increases with higher processing fee', () => {
    const apr1 = calculateAPR(10_00_000, 12, 36, 1);
    const apr2 = calculateAPR(10_00_000, 12, 36, 3);
    expect(apr2).toBeGreaterThan(apr1);
  });

  it('APR difference is larger for shorter tenure (fee amortised over less time)', () => {
    const aprShort = calculateAPR(10_00_000, 12, 12, 2);
    const aprLong = calculateAPR(10_00_000, 12, 60, 2);
    // Same fee on shorter tenure → higher APR impact
    expect(aprShort - 12).toBeGreaterThan(aprLong - 12);
  });

  it('APR returns 0 for zero principal', () => {
    expect(calculateAPR(0, 12, 36, 2)).toBe(0);
  });
});

// ═══ FOIR ══════════════════════════════════════════════════════════════════

describe('FOIR Calculation', () => {
  it('calculates current and projected FOIR', () => {
    const { currentFoir, projectedFoir } = calculateFOIR(1_00_000, 14_000, 20_000);
    expect(currentFoir).toBeCloseTo(0.14, 2);
    expect(projectedFoir).toBeCloseTo(0.34, 2);
  });

  it('handles zero income safely', () => {
    const { currentFoir, projectedFoir } = calculateFOIR(0, 14_000, 20_000);
    expect(currentFoir).toBe(1);
    expect(projectedFoir).toBe(1);
  });

  it('FOIR caps are defined for all income types', () => {
    expect(FOIR_CAPS.salaried.lender).toBeGreaterThan(0);
    expect(FOIR_CAPS.self_employed.lender).toBeGreaterThan(0);
    expect(FOIR_CAPS.informal.lender).toBeGreaterThan(0);
  });

  it('salaried FOIR cap > self-employed > informal', () => {
    expect(FOIR_CAPS.salaried.lender).toBeGreaterThan(FOIR_CAPS.self_employed.lender);
    expect(FOIR_CAPS.self_employed.lender).toBeGreaterThan(FOIR_CAPS.informal.lender);
  });

  it('safe caps are lower than lender caps', () => {
    expect(FOIR_CAPS.salaried.safe).toBeLessThan(FOIR_CAPS.salaried.lender);
    expect(FOIR_CAPS.self_employed.safe).toBeLessThan(FOIR_CAPS.self_employed.lender);
    expect(FOIR_CAPS.informal.safe).toBeLessThan(FOIR_CAPS.informal.lender);
  });
});

// ═══ INCOME CONSIDERATION ══════════════════════════════════════════════════

describe('Effective Income', () => {
  it('uses full income for salaried', () => {
    const { lenderIncome } = getEffectiveIncome({ monthlyIncome: 1_00_000, incomeType: 'salaried' });
    expect(lenderIncome).toBe(1_00_000);
  });

  it('discounts income for self-employed without ITR', () => {
    const { lenderIncome } = getEffectiveIncome({ monthlyIncome: 80_000, incomeType: 'self_employed' });
    expect(lenderIncome).toBeLessThan(80_000);
  });

  it('uses ITR income for self-employed when available', () => {
    const { lenderIncome } = getEffectiveIncome({
      monthlyIncome: 80_000,
      incomeType: 'self_employed',
      itrIncome: 4_20_000,
    });
    expect(lenderIncome).toBe(35_000); // 4,20,000 / 12
  });

  it('heavily discounts informal income', () => {
    const { lenderIncome } = getEffectiveIncome({ monthlyIncome: 28_000, incomeType: 'informal' });
    expect(lenderIncome).toBe(14_000); // 50%
  });

  it('uses lower end of range for variable income (self-employed)', () => {
    const { lenderIncome } = getEffectiveIncome({
      monthlyIncome: 60_000,
      incomeType: 'self_employed',
      incomeRangeLow: 40_000,
      incomeRangeHigh: 80_000,
    });
    // Should use 40000 × 0.75 = 30000
    expect(lenderIncome).toBe(30_000);
  });
});

// ═══ UNKNOWN HANDLING ══════════════════════════════════════════════════════

describe('Unknown Answer Handling', () => {
  it('unknown credit score maps to "unknown" band, not "below_650"', () => {
    const band = scoreToBand(undefined);
    expect(band).toBe('unknown');
  });

  it('explicit "unknown" maps to unknown band', () => {
    const band = scoreToBand('unknown');
    expect(band).toBe('unknown');
  });

  it('unknown score gives wider rate band than 750+ score', () => {
    const known = RATE_GRID.personal['750+'];
    const unknown = RATE_GRID.personal['unknown'];
    const knownWidth = known[1] - known[0];
    const unknownWidth = unknown[1] - unknown[0];
    expect(unknownWidth).toBeGreaterThan(knownWidth);
  });

  it('confidence widening is higher for unknown credit score', () => {
    const withScore = calculateConfidence(
      { monthlyIncome: 100000, creditScore: 750, incomeType: 'salaried' } as BorrowerAnswers,
      'rate'
    );
    const withoutScore = calculateConfidence(
      { monthlyIncome: 100000, incomeType: 'salaried' } as BorrowerAnswers,
      'rate'
    );
    expect(withoutScore.widenPct).toBeGreaterThan(withScore.widenPct);
  });

  it('unknown savings does not kill the assessment', () => {
    const answers: BorrowerAnswers = {
      loanPurpose: 'wedding',
      amountWanted: 5_00_000,
      monthlyIncome: 80_000,
      incomeType: 'salaried',
      existingEmis: 0,
      monthlyExpenses: 30_000,
      age: 30,
      creditScore: 750,
      // emergencySavingsMonths: NOT provided
    };
    const result = runAssessment(answers);
    expect(result.verdict.decision).toBeDefined();
    expect(result.emiResult.emiCeiling).toBeGreaterThan(0);
  });
});

// ═══ HIGH-COST DEBT ══════════════════════════════════════════════════════

describe('High-Cost Debt Detection', () => {
  it('detects high-cost debt from summary fields', () => {
    const result = hasHighCostDebt({
      existingDebtRate: 30,
      existingDebtOutstanding: 35_000,
    });
    expect(result.hasHighCost).toBe(true);
    expect(result.rate).toBe(30);
    expect(result.recommendation).toBeDefined();
  });

  it('does not flag low-rate debt as high-cost', () => {
    const result = hasHighCostDebt({
      existingDebtRate: 10,
      existingDebtOutstanding: 5_00_000,
    });
    expect(result.hasHighCost).toBe(false);
  });

  it('does not flag small outstanding amounts', () => {
    const result = hasHighCostDebt({
      existingDebtRate: 30,
      existingDebtOutstanding: 5_000,
    });
    expect(result.hasHighCost).toBe(false);
  });

  it('does not flag when fields are missing', () => {
    const result = hasHighCostDebt({});
    expect(result.hasHighCost).toBe(false);
  });
});

// ═══ BOUNCED EMI ══════════════════════════════════════════════════════════

describe('Bounced EMI Impact', () => {
  it('bounces increase rate band', () => {
    const baseAnswers: BorrowerAnswers = {
      monthlyIncome: 50_000,
      incomeType: 'salaried',
      creditScore: 750,
    };

    const noBounce = getRateBand(baseAnswers, 'personal', 36, 5_00_000);
    const withBounce = getRateBand({ ...baseAnswers, emiBounces: 2 }, 'personal', 36, 5_00_000);

    expect(withBounce.nominalRate[0]).toBeGreaterThan(noBounce.nominalRate[0]);
  });

  it('multiple bounces + high-cost debt triggers dont_borrow', () => {
    const answers: BorrowerAnswers = {
      loanPurpose: 'vehicle',
      amountWanted: 1_50_000,
      monthlyIncome: 28_000,
      incomeType: 'informal',
      existingEmis: 5_000,
      monthlyExpenses: 15_000,
      age: 35,
      creditScore: 'unknown',
      emiBounces: 1,
      existingDebtRate: 30,
      existingDebtOutstanding: 35_000,
    };

    const verdict = generateVerdict(answers);
    expect(verdict.decision).toBe('dont_borrow');
    expect(verdict.debtFirstRecommendation).toBeDefined();
  });
});

// ═══ COLLATERAL / LTV ═══════════════════════════════════════════════════

describe('Collateral and LTV', () => {
  it('collateral enables LAP as a comparison option', () => {
    const products = getApplicableProducts({
      loanPurpose: 'business_expansion',
      amountWanted: 15_00_000,
      incomeType: 'self_employed',
      collateralAvailable: true,
      collateralValue: 45_00_000,
    });
    expect(products).toContain('lap');
  });

  it('without collateral, LAP is not offered for business', () => {
    const products = getApplicableProducts({
      loanPurpose: 'business_expansion',
      amountWanted: 15_00_000,
      incomeType: 'self_employed',
      collateralAvailable: false,
    });
    expect(products).not.toContain('lap');
  });

  it('collateral enables secured business loan option', () => {
    const products = getApplicableProducts({
      loanPurpose: 'business_expansion',
      amountWanted: 15_00_000,
      incomeType: 'self_employed',
      collateralAvailable: true,
      collateralValue: 45_00_000,
    });
    expect(products).toContain('business_secured');
  });
});

// ═══ PRODUCTIVE LOANS ═══════════════════════════════════════════════════

describe('Productive Loan Adjustment', () => {
  it('productive loan increases safe EMI ceiling', () => {
    const base: BorrowerAnswers = {
      monthlyIncome: 60_000,
      incomeType: 'self_employed',
      existingEmis: 0,
      monthlyExpenses: 25_000,
      emergencySavingsMonths: 3,
    };

    const productive: BorrowerAnswers = {
      ...base,
      loanWillGenerateIncome: true,
      expectedMonthlyIncomeFromLoan: 15_000,
    };

    const baseCeiling = getSafeEmiCeiling(base).safeEmi;
    const productiveCeiling = getSafeEmiCeiling(productive).safeEmi;

    expect(productiveCeiling).toBeGreaterThan(baseCeiling);
  });

  it('productive offset is conservative (50% of expected)', () => {
    const answers: BorrowerAnswers = {
      monthlyIncome: 60_000,
      incomeType: 'self_employed',
      existingEmis: 0,
      monthlyExpenses: 25_000,
      emergencySavingsMonths: 3,
      loanWillGenerateIncome: true,
      expectedMonthlyIncomeFromLoan: 20_000,
    };

    const { components } = getSafeEmiCeiling(answers);
    // 50% of 20000 = 10000
    expect(components.productiveOffset).toBe(10_000);
  });
});

// ═══ CONFIDENCE SYSTEM ═══════════════════════════════════════════════════

describe('Confidence System', () => {
  it('all fields known = high confidence', () => {
    const answers: BorrowerAnswers = {
      monthlyIncome: 100000,
      incomeType: 'salaried',
      existingEmis: 14000,
      monthlyExpenses: 28000,
      creditScore: 780,
      emergencySavingsMonths: 6,
      emiBounces: 0,
      loanPurpose: 'wedding',
    };
    const conf = calculateConfidence(answers, 'verdict');
    expect(conf.level).toBe('high');
  });

  it('few fields known = low confidence', () => {
    const answers: BorrowerAnswers = {
      monthlyIncome: 50000,
    };
    const conf = calculateConfidence(answers, 'verdict');
    expect(conf.level).toBe('low');
    expect(conf.unknownFields.length).toBeGreaterThan(conf.knownFields.length);
  });

  it('confidence is output-specific', () => {
    const answers: BorrowerAnswers = {
      monthlyIncome: 100000,
      incomeType: 'salaried',
      existingEmis: 14000,
      monthlyExpenses: 28000,
      // No creditScore — affects rate but not EMI as much
    };
    const rateConf = calculateConfidence(answers, 'rate');
    const emiConf = calculateConfidence(answers, 'emi');
    // Rate confidence should be lower than EMI since credit score is missing
    expect(rateConf.unknownFields).toContain('creditScore');
    expect(emiConf.unknownFields).not.toContain('creditScore');
  });
});

// ═══ THREE BORROWERS ══════════════════════════════════════════════════════

describe('Priya — Salaried, Bengaluru', () => {
  const priya: BorrowerAnswers = {
    loanPurpose: 'wedding',
    amountWanted: 8_00_000,
    monthlyIncome: 1_10_000,
    incomeType: 'salaried',
    existingEmis: 14_000,
    monthlyExpenses: 28_000,
    age: 29,
    creditScore: 780,
    yearsInJob: 5,
    emergencySavingsMonths: 6,
    emiBounces: 0,
  };

  it('verdict is determined by rules, not hardcoded', () => {
    const verdict = generateVerdict(priya);
    // Should be borrow — comfortable FOIR
    expect(verdict.decision).toBe('borrow');
    expect(verdict.reason).toBeDefined();
    expect(verdict.reason.length).toBeGreaterThan(10);
  });

  it('FOIR is well within limits', () => {
    const { currentFoir } = calculateFOIR(1_10_000, 14_000, 0);
    expect(currentFoir).toBeLessThan(FOIR_CAPS.salaried.safe);
  });

  it('gets personal loan product', () => {
    const products = getApplicableProducts(priya);
    expect(products).toContain('personal');
  });

  it('rate band reflects 750+ score and salaried', () => {
    const rate = getRateBand(priya, 'personal', 36, 8_00_000);
    expect(rate.nominalRate[0]).toBeGreaterThanOrEqual(10);
    expect(rate.nominalRate[1]).toBeLessThanOrEqual(14);
  });

  it('APR is higher than nominal rate', () => {
    const rate = getRateBand(priya, 'personal', 36, 8_00_000);
    expect(rate.apr[0]).toBeGreaterThan(rate.nominalRate[0]);
  });

  it('safe carry amount covers requested ₹8L', () => {
    const eligibility = calculateEligibility(priya);
    expect(eligibility.safeCarryAmount[1]).toBeGreaterThanOrEqual(8_00_000);
  });

  it('full assessment produces all outputs', () => {
    const result = runAssessment(priya);
    expect(result.verdict).toBeDefined();
    expect(result.eligibility).toBeDefined();
    expect(result.rateBand).toBeDefined();
    expect(result.emiResult).toBeDefined();
    expect(result.negotiationCard).toBeDefined();
  });
});

describe('Ravi — Self-employed, Mysuru', () => {
  const ravi: BorrowerAnswers = {
    loanPurpose: 'business_expansion',
    amountWanted: 15_00_000,
    monthlyIncome: 60_000,  // midpoint of 40k-80k
    incomeType: 'self_employed',
    existingEmis: 0,
    monthlyExpenses: 20_000,
    age: 42,
    creditScore: 'unknown',
    yearsInJob: 14,
    itrFiled: true,
    itrIncome: 4_20_000,
    collateralAvailable: true,
    collateralValue: 45_00_000,
    coApplicantAvailable: true,
    coApplicantIncome: 18_000,
    incomeRangeLow: 40_000,
    incomeRangeHigh: 80_000,
    loanWillGenerateIncome: true,
    expectedMonthlyIncomeFromLoan: 15_000,
    emergencySavingsMonths: 4,
  };

  it('offers both secured and unsecured options for comparison', () => {
    const products = getApplicableProducts(ravi);
    // Should have both secured and unsecured options
    const hasSecured = products.some(p => p === 'lap' || p === 'business_secured');
    const hasUnsecured = products.some(p => p === 'business_unsecured');
    expect(hasSecured).toBe(true);
    expect(hasUnsecured).toBe(true);
  });

  it('uses ITR income for lender calculation', () => {
    const { lenderIncome } = getEffectiveIncome(ravi);
    expect(lenderIncome).toBe(35_000); // 4,20,000 / 12
  });

  it('unknown credit score widens rate band', () => {
    const rate = getRateBand(ravi, 'business_unsecured', 60, 15_00_000);
    const rateWidth = rate.nominalRate[1] - rate.nominalRate[0];
    expect(rateWidth).toBeGreaterThan(5); // Wide range for unknown
  });

  it('collateral value drives LAP eligibility', () => {
    const eligibility = calculateEligibility(ravi);
    const lapProduct = eligibility.applicableProducts.find(p => p.product === 'lap');
    if (lapProduct) {
      // LAP at 60% LTV of ₹45L = ₹27L max → should cover ₹15L
      expect(lapProduct.eligible).toBe(true);
    }
  });

  it('productive loan consideration increases safe carry', () => {
    const withProductive = getSafeEmiCeiling(ravi);
    const withoutProductive = getSafeEmiCeiling({ ...ravi, loanWillGenerateIncome: false });
    expect(withProductive.safeEmi).toBeGreaterThan(withoutProductive.safeEmi);
  });

  it('verdict allows borrowing (or borrow_less at worst)', () => {
    const verdict = generateVerdict(ravi);
    expect(['borrow', 'borrow_less']).toContain(verdict.decision);
  });

  it('full assessment includes product comparison', () => {
    const result = runAssessment(ravi);
    expect(result.eligibility.applicableProducts.length).toBeGreaterThan(1);
  });
});

describe('Anita — Informal, Hubballi', () => {
  const anita: BorrowerAnswers = {
    loanPurpose: 'vehicle',
    amountWanted: 1_50_000,
    monthlyIncome: 28_000,  // midpoint of 26k-30k
    incomeType: 'informal',
    existingEmis: 5_000,    // Approx EMI from ₹35k outstanding
    monthlyExpenses: 18_000,
    age: 35,
    creditScore: 'unknown',
    emiBounces: 1,
    existingDebtRate: 30,
    existingDebtOutstanding: 35_000,
    emergencySavingsMonths: 0,
    dependents: 3,  // 2 children + unemployed husband
    incomeRangeLow: 26_000,
    incomeRangeHigh: 30_000,
  };

  it('triggers "dont_borrow" verdict', () => {
    const verdict = generateVerdict(anita);
    expect(verdict.decision).toBe('dont_borrow');
  });

  it('provides debt-first recommendation', () => {
    const verdict = generateVerdict(anita);
    expect(verdict.debtFirstRecommendation).toBeDefined();
    expect(verdict.debtFirstRecommendation!.length).toBeGreaterThan(10);
  });

  it('detects high-cost existing debt', () => {
    const highCost = hasHighCostDebt(anita);
    expect(highCost.hasHighCost).toBe(true);
    expect(highCost.rate).toBe(30);
  });

  it('informal income is heavily discounted', () => {
    const { lenderIncome } = getEffectiveIncome(anita);
    expect(lenderIncome).toBeLessThanOrEqual(14_000); // 50% of 28k
  });

  it('rate band reflects informal + unknown score', () => {
    const rate = getRateBand(anita, 'two_wheeler', 36, 1_50_000);
    // Should be high: informal premium + unknown + bounce
    expect(rate.nominalRate[0]).toBeGreaterThan(15);
  });

  it('full assessment still produces all outputs even with dont_borrow', () => {
    const result = runAssessment(anita);
    expect(result.verdict.decision).toBe('dont_borrow');
    expect(result.eligibility).toBeDefined();
    expect(result.rateBand).toBeDefined();
    expect(result.emiResult).toBeDefined();
    expect(result.negotiationCard).toBeDefined();
  });

  it('negotiation card includes debt-first advice', () => {
    const result = runAssessment(anita);
    expect(result.negotiationCard.verdict.decision).toContain('Not recommended');
  });
});

// ═══ EDGE CASES ═══════════════════════════════════════════════════════════

describe('Edge Cases', () => {
  it('minimum viable answers produce an assessment', () => {
    const minimal: BorrowerAnswers = {
      loanPurpose: 'other',
      amountWanted: 1_00_000,
      monthlyIncome: 30_000,
      incomeType: 'salaried',
    };
    const result = runAssessment(minimal);
    expect(result.verdict.decision).toBeDefined();
    expect(result.emiResult.emiCeiling).toBeGreaterThanOrEqual(0);
  });

  it('extremely high FOIR triggers dont_borrow', () => {
    const overloaded: BorrowerAnswers = {
      loanPurpose: 'personal' as any,
      amountWanted: 50_00_000,
      monthlyIncome: 30_000,
      incomeType: 'salaried',
      existingEmis: 20_000,
      monthlyExpenses: 15_000,
    };
    const verdict = generateVerdict(overloaded);
    expect(verdict.decision).toBe('dont_borrow');
  });

  it('zero existing EMI is handled correctly', () => {
    const clean: BorrowerAnswers = {
      loanPurpose: 'wedding',
      amountWanted: 3_00_000,
      monthlyIncome: 80_000,
      incomeType: 'salaried',
      existingEmis: 0,
      monthlyExpenses: 25_000,
      age: 28,
      creditScore: 800,
    };
    const verdict = generateVerdict(clean);
    expect(verdict.decision).toBe('borrow');
  });

  it('co-applicant income boosts eligibility', () => {
    const base: BorrowerAnswers = {
      monthlyIncome: 50_000,
      incomeType: 'salaried',
      existingEmis: 0,
      loanPurpose: 'wedding',
      amountWanted: 5_00_000,
    };

    const withCoApplicant: BorrowerAnswers = {
      ...base,
      coApplicantAvailable: true,
      coApplicantIncome: 30_000,
    };

    const baseEligibility = calculateEligibility(base);
    const boostedEligibility = calculateEligibility(withCoApplicant);

    expect(boostedEligibility.lenderLikelyAmount[1]).toBeGreaterThan(
      baseEligibility.lenderLikelyAmount[1]
    );
  });

  it('lender comparison works correctly', () => {
    const answers: BorrowerAnswers = {
      monthlyIncome: 100_000,
      incomeType: 'salaried',
      creditScore: 780,
      existingLenderOffer: true,
      offeredRate: 18,
      offeredProcessingFee: 3,
      offeredTenureMonths: 36,
    };

    const rateBand = getRateBand(answers, 'personal', 36, 5_00_000);
    const comparison = compareLenderOffer(answers, rateBand, 5_00_000);

    expect(comparison).not.toBeNull();
    expect(comparison!.verdict).toBe('overpaying');
    expect(comparison!.savingsIfFair).toBeGreaterThan(0);
  });
});
