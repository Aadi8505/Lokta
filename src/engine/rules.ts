/**
 * rules.ts — Single source of truth for the Borrower Copilot.
 *
 * Every threshold, rate band, fee, cap, stress assumption, and confidence
 * multiplier lives here. Nothing in the UI or other engine files should
 * hard-code a lending number. If it's a number that affects an output,
 * it belongs in this file.
 *
 * Mirrored in /RULES.md with: what · value · why · source.
 */

// ─── Income Types ───────────────────────────────────────────────────────────

export type IncomeType = 'salaried' | 'self_employed' | 'informal';

export type CreditScoreBand = '750+' | '700-749' | '650-699' | 'below_650' | 'unknown';

export type LoanProduct =
  | 'personal'
  | 'home'
  | 'lap'         // Loan Against Property
  | 'gold'
  | 'two_wheeler'
  | 'business_unsecured'
  | 'business_secured';

export type LoanPurpose =
  | 'wedding'
  | 'home_purchase'
  | 'home_renovation'
  | 'vehicle'
  | 'business_expansion'
  | 'business_vehicle'
  | 'education'
  | 'medical'
  | 'debt_consolidation'
  | 'consumer_durable'
  | 'personal'
  | 'other';

// ─── FOIR (Fixed Obligations to Income Ratio) Caps ──────────────────────────
// Source: RBI guidelines + industry practice. Salaried can go higher because
// income is stable and verifiable. Informal gets the tightest cap because
// lenders discount informal income heavily.

export const FOIR_CAPS: Record<IncomeType, { lender: number; safe: number }> = {
  salaried:      { lender: 0.55, safe: 0.45 },   // Lenders allow up to 55%, safe at 45%
  self_employed:  { lender: 0.50, safe: 0.40 },   // More variable income, tighter
  informal:      { lender: 0.40, safe: 0.30 },    // Hardest to verify, tightest
};

// ─── FOIR Hard Ceilings ─────────────────────────────────────────────────────
// Beyond these, verdict is always "Don't borrow"

export const FOIR_HARD_CEILING = 0.75;            // No one should cross 75% FOIR
export const FOIR_WARNING_ZONE = 0.60;            // 60-75% triggers "Borrow less"

// ─── Income Consideration for Self-Employed / Informal ──────────────────────
// When ITR income differs from stated income, lenders use the lower.
// We use ITR if available, else discount stated income.

export const INCOME_DISCOUNT: Record<IncomeType, number> = {
  salaried:      1.0,   // Full income considered
  self_employed:  0.75,  // 75% of stated if no ITR; ITR figure if available
  informal:      0.50,  // 50% of stated — lenders heavily discount informal
};

// ─── Emergency Savings Thresholds ───────────────────────────────────────────
// Used when borrower provides actual savings months. These thresholds
// affect the verdict and safe-carry calculation.

export const SAVINGS_THRESHOLDS = {
  critical: 1,      // < 1 month → red flag, affects verdict
  low: 2,           // < 2 months → warning, reduces safe-carry
  adequate: 3,      // 3-6 months → standard
  strong: 6,        // 6+ months → positive signal
};

// ─── Rate Grid ──────────────────────────────────────────────────────────────
// Rate bands by product × credit score band.
// Source: Aggregated from BankBazaar, PaisaBazaar, and major bank published
// rates as of mid-2026. "My judgement" for bands where public data is sparse.
//
// Each entry is [minRate, maxRate] as annual percentage.
// Unknown credit score maps to widest band (not worst — see confidence note).

export const RATE_GRID: Record<LoanProduct, Record<CreditScoreBand, [number, number]>> = {
  personal: {
    '750+':      [10.50, 13.00],
    '700-749':   [13.00, 16.00],
    '650-699':   [16.00, 20.00],
    'below_650': [20.00, 26.00],
    'unknown':   [12.00, 22.00],  // Wide band: could be anywhere
  },
  home: {
    '750+':      [8.50, 9.50],
    '700-749':   [9.50, 10.50],
    '650-699':   [10.50, 12.00],
    'below_650': [12.00, 14.00],
    'unknown':   [9.00, 13.00],
  },
  lap: {
    '750+':      [9.00, 11.00],
    '700-749':   [11.00, 13.00],
    '650-699':   [13.00, 15.50],
    'below_650': [15.00, 18.00],
    'unknown':   [10.00, 16.00],
  },
  gold: {
    '750+':      [9.00, 12.00],
    '700-749':   [9.00, 12.00],
    '650-699':   [9.00, 12.00],
    'below_650': [9.00, 13.00],
    'unknown':   [9.00, 12.00],  // Gold loans are collateral-backed, score matters less
  },
  two_wheeler: {
    '750+':      [12.00, 16.00],
    '700-749':   [16.00, 20.00],
    '650-699':   [20.00, 24.00],
    'below_650': [24.00, 30.00],
    'unknown':   [14.00, 26.00],
  },
  business_unsecured: {
    '750+':      [14.00, 18.00],
    '700-749':   [18.00, 22.00],
    '650-699':   [22.00, 26.00],
    'below_650': [26.00, 32.00],
    'unknown':   [16.00, 28.00],
  },
  business_secured: {
    '750+':      [10.00, 13.00],
    '700-749':   [13.00, 16.00],
    '650-699':   [16.00, 19.00],
    'below_650': [19.00, 22.00],
    'unknown':   [11.00, 19.00],
  },
};

// ─── Income-Type Rate Adjustment ────────────────────────────────────────────
// Self-employed and informal pay a premium over salaried rates.
// Applied as additive basis points to the rate band.

export const INCOME_TYPE_RATE_PREMIUM: Record<IncomeType, number> = {
  salaried:      0,     // Base rate
  self_employed:  1.5,   // +150 bps
  informal:      3.0,   // +300 bps — high risk premium
};

// ─── Processing Fee Defaults ────────────────────────────────────────────────
// As percentage of loan amount. Used in APR calculation.
// Source: Industry standard ranges.

export const PROCESSING_FEE_RANGE: Record<LoanProduct, [number, number]> = {
  personal:           [1.5, 3.0],
  home:               [0.25, 1.0],
  lap:                [0.50, 1.5],
  gold:               [0.50, 1.5],
  two_wheeler:        [1.0, 2.5],
  business_unsecured: [1.5, 3.0],
  business_secured:   [0.50, 1.5],
};

// ─── Loan Product Configuration ─────────────────────────────────────────────

export interface ProductConfig {
  minTenureMonths: number;
  maxTenureMonths: number;
  typicalTenureMonths: number[];      // For trade-off display
  minAmount: number;
  maxAmount: number;
  secured: boolean;
  maxLTV: number;                      // Loan-to-value for secured products
}

export const PRODUCT_CONFIG: Record<LoanProduct, ProductConfig> = {
  personal: {
    minTenureMonths: 12,
    maxTenureMonths: 60,
    typicalTenureMonths: [12, 24, 36, 48, 60],
    minAmount: 50_000,
    maxAmount: 25_00_000,
    secured: false,
    maxLTV: 0,
  },
  home: {
    minTenureMonths: 60,
    maxTenureMonths: 360,
    typicalTenureMonths: [60, 120, 180, 240, 300],
    minAmount: 5_00_000,
    maxAmount: 500_00_000,
    secured: true,
    maxLTV: 0.80,
  },
  lap: {
    minTenureMonths: 36,
    maxTenureMonths: 180,
    typicalTenureMonths: [36, 60, 84, 120, 180],
    minAmount: 3_00_000,
    maxAmount: 500_00_000,
    secured: true,
    maxLTV: 0.60,
  },
  gold: {
    minTenureMonths: 3,
    maxTenureMonths: 36,
    typicalTenureMonths: [3, 6, 12, 24, 36],
    minAmount: 10_000,
    maxAmount: 50_00_000,
    secured: true,
    maxLTV: 0.75,
  },
  two_wheeler: {
    minTenureMonths: 12,
    maxTenureMonths: 48,
    typicalTenureMonths: [12, 24, 36, 48],
    minAmount: 25_000,
    maxAmount: 3_00_000,
    secured: true,
    maxLTV: 0.85,
  },
  business_unsecured: {
    minTenureMonths: 12,
    maxTenureMonths: 60,
    typicalTenureMonths: [12, 24, 36, 48, 60],
    minAmount: 1_00_000,
    maxAmount: 50_00_000,
    secured: false,
    maxLTV: 0,
  },
  business_secured: {
    minTenureMonths: 36,
    maxTenureMonths: 180,
    typicalTenureMonths: [36, 60, 84, 120, 180],
    minAmount: 1_00_000,
    maxAmount: 500_00_000,
    secured: true,
    maxLTV: 0.60,
  },
};

// ─── Purpose → Product Mapping ──────────────────────────────────────────────
// Maps stated purpose to possible loan products. Multiple products may apply.
// The engine recommends comparing when collateral is available.

export const PURPOSE_TO_PRODUCTS: Record<LoanPurpose, LoanProduct[]> = {
  wedding:             ['personal'],
  home_purchase:       ['home'],
  home_renovation:     ['personal'],
  vehicle:             ['two_wheeler', 'personal'],
  business_expansion:  ['business_unsecured'],
  business_vehicle:    ['business_unsecured', 'two_wheeler'],
  education:           ['personal'],
  medical:             ['personal', 'gold'],
  debt_consolidation:  ['personal', 'gold'],
  consumer_durable:    ['personal'],
  personal:            ['personal'],
  other:               ['personal'],
};

// ─── Stress Test Parameters ─────────────────────────────────────────────────

export const STRESS = {
  rateRiseBps: 200,          // +2% rate increase scenario
  incomeDropPct: 0.20,       // 20% income drop scenario
};

// ─── Verdict Thresholds ─────────────────────────────────────────────────────
// These drive the Borrow / Don't / Borrow Less decision.

export const VERDICT_RULES = {
  // "Don't borrow" triggers
  dontBorrow: {
    foirAfterNewEmiCeiling: FOIR_HARD_CEILING,           // 75%
    existingHighCostDebtRate: 0.25,                       // 25% — if existing debt is at 25%+ rates
    bouncedEmiWithUnsecuredNewDebt: true,                 // Recent bounce + seeking unsecured = stop
    savingsMonthsFloor: 1,                                // < 1 month savings with no collateral
  },

  // "Borrow less" triggers
  borrowLess: {
    foirWarningZone: FOIR_WARNING_ZONE,                  // 60%
    savingsMonthsWarning: 2,                              // < 2 months savings
    requestedExceedsSafeCarry: true,                      // Requested > safe but < lender-eligible
  },

  // Special: high-cost existing debt recommendation
  debtFirstRecommendation: {
    existingRateThreshold: 0.20,   // If paying 20%+ on existing debt
    minOutstanding: 10_000,        // With at least ₹10k outstanding
  },
};

// ─── Confidence System ──────────────────────────────────────────────────────
// Output-specific confidence. Each output has fields that matter to it.
// Confidence is based on how many relevant fields are known, not total questions.

export type OutputType = 'verdict' | 'eligibility' | 'rate' | 'emi';

// Fields relevant to each output — used for confidence calculation
export const CONFIDENCE_FIELDS: Record<OutputType, string[]> = {
  verdict: [
    'monthlyIncome', 'incomeType', 'existingEmis', 'monthlyExpenses',
    'creditScore', 'emergencySavingsMonths', 'emiBounces', 'loanPurpose',
  ],
  eligibility: [
    'monthlyIncome', 'incomeType', 'existingEmis', 'creditScore',
    'yearsInJob', 'itrIncome', 'collateralValue', 'coApplicantIncome',
  ],
  rate: [
    'creditScore', 'incomeType', 'monthlyIncome', 'yearsInJob',
    'collateralValue', 'emiBounces',
  ],
  emi: [
    'monthlyIncome', 'existingEmis', 'monthlyExpenses',
    'emergencySavingsMonths', 'incomeVariability',
  ],
};

// Confidence widening: for each missing relevant field, the range widens by this factor
export const CONFIDENCE_WIDEN_PER_MISSING_FIELD = 0.08;  // 8% wider per missing field
export const CONFIDENCE_MIN_WIDTH = 0.05;                 // Minimum 5% range width
export const CONFIDENCE_MAX_WIDTH = 0.50;                 // Maximum 50% range width

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export const CONFIDENCE_THRESHOLDS = {
  high: 0.75,    // >= 75% of relevant fields known
  medium: 0.50,  // >= 50%
  // Below 50% = low
};

// ─── Productive Loan Adjustments ────────────────────────────────────────────
// When a loan is expected to generate income (business, work vehicle),
// the expected incremental income offsets EMI burden — with stress applied.

export const PRODUCTIVE_LOAN = {
  incomeOffsetFactor: 0.50,     // Only count 50% of expected incremental income
  stressedOffsetFactor: 0.30,   // Under stress, count only 30%
};

// ─── Unknown Answer Handling ────────────────────────────────────────────────
// When a field is unknown, we widen the relevant output ranges.
// We NEVER treat unknown as zero or as a bad value.

export const UNKNOWN_PENALTIES: Record<string, { affectedOutputs: OutputType[]; widenPct: number; explanation: string }> = {
  creditScore: {
    affectedOutputs: ['rate', 'eligibility'],
    widenPct: 0.15,
    explanation: 'Without a credit score, lenders will quote a wider range. Getting your CIBIL score (₹550 online) could narrow your rate by 3–5%.',
  },
  emergencySavingsMonths: {
    affectedOutputs: ['verdict', 'emi'],
    widenPct: 0.08,
    explanation: 'Without knowing your savings buffer, we assume moderate risk. Knowing your exact savings helps us set a safer EMI ceiling.',
  },
  monthlyExpenses: {
    affectedOutputs: ['verdict', 'emi'],
    widenPct: 0.10,
    explanation: 'Without detailed expenses, we use income-based estimates. Your actual EMI ceiling may differ.',
  },
  yearsInJob: {
    affectedOutputs: ['eligibility', 'rate'],
    widenPct: 0.05,
    explanation: 'Job/business tenure affects lender confidence. Longer tenure typically means better rates.',
  },
  itrIncome: {
    affectedOutputs: ['eligibility'],
    widenPct: 0.12,
    explanation: 'Without ITR documentation, lenders will use a lower income figure, reducing your eligible amount.',
  },
  collateralValue: {
    affectedOutputs: ['eligibility', 'rate'],
    widenPct: 0.10,
    explanation: 'If you have property or gold, a secured loan could cut your rate significantly.',
  },
  incomeVariability: {
    affectedOutputs: ['verdict', 'emi'],
    widenPct: 0.08,
    explanation: 'Knowing whether your income is stable or seasonal helps set a safer EMI ceiling.',
  },
};

// ─── Indian Number Formatting ───────────────────────────────────────────────

export const INR_LOCALE = 'en-IN';
export const INR_CURRENCY = 'INR';

// ─── Lender Offer Comparison ────────────────────────────────────────────────

export const LENDER_COMPARISON = {
  goodDealThresholdBps: -50,       // Offered rate is 50bps+ below fair range midpoint = good deal
  fairDealThresholdBps: 100,       // Within 100bps above midpoint = fair
  // Above 100bps = overpaying
};
