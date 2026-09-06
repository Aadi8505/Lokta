/**
 * types.ts — Shared types for the Borrower Copilot engine.
 */

import type {
  IncomeType,
  CreditScoreBand,
  LoanProduct,
  LoanPurpose,
  ConfidenceLevel,
  OutputType,
} from './rules';

// ─── Borrower Answers ───────────────────────────────────────────────────────

export interface BorrowerAnswers {
  // Must questions
  loanPurpose?: LoanPurpose;
  amountWanted?: number;
  preferredProduct?: LoanProduct;       // Can be auto-determined
  monthlyIncome?: number;               // Net monthly income
  incomeType?: IncomeType;
  existingEmis?: number;                // Total existing EMI outflow
  monthlyExpenses?: number;             // Household expenses
  age?: number;
  creditScore?: number | 'unknown';
  // city removed per plan — no city-based rate adjustments

  // Additional questions
  yearsInJob?: number;
  incomeVariability?: 'stable' | 'seasonal' | 'volatile';
  itrFiled?: boolean;
  itrIncome?: number;                   // Annual ITR income
  collateralAvailable?: boolean;
  collateralValue?: number;
  existingLoanCount?: number;
  existingLoanDetails?: ExistingLoanDetail[];
  emiBounces?: number;                  // Bounces in last 12 months
  cardUtilisation?: number;             // 0-100 percentage
  emergencySavingsMonths?: number;      // Months of expenses saved
  coApplicantAvailable?: boolean;
  coApplicantIncome?: number;
  upcomingLargeExpenses?: boolean;
  upcomingExpenseAmount?: number;
  loanWillGenerateIncome?: boolean;
  expectedMonthlyIncomeFromLoan?: number;
  existingLenderOffer?: boolean;
  offeredRate?: number;
  offeredProcessingFee?: number;
  offeredTenureMonths?: number;
  incomeRangeLow?: number;             // For variable income: low end
  incomeRangeHigh?: number;            // For variable income: high end
  existingDebtRate?: number;           // Interest rate on existing high-cost debt
  existingDebtOutstanding?: number;    // Outstanding amount on high-cost debt
  dependents?: number;
}

export interface ExistingLoanDetail {
  type: string;
  emi: number;
  remainingMonths: number;
  rate?: number;
  outstanding?: number;
}

// ─── Computed Outputs ───────────────────────────────────────────────────────

export interface Verdict {
  decision: 'borrow' | 'borrow_less' | 'dont_borrow';
  reason: string;
  details: string[];                   // Supporting reasons
  debtFirstRecommendation?: string;    // If existing high-cost debt should be addressed
  confidenceLevel: ConfidenceLevel;
  confidenceExplanation: string;
}

export interface Eligibility {
  lenderLikelyAmount: [number, number];        // [low, high]
  safeCarryAmount: [number, number];            // [low, high]
  recommendedAmount: number;                     // Which to use
  recommendationReason: string;
  applicableProducts: ProductRecommendation[];
  confidenceLevel: ConfidenceLevel;
  confidenceExplanation: string;
  explanations: Record<string, string>;          // "Why this number" per field
}

export interface ProductRecommendation {
  product: LoanProduct;
  label: string;
  eligible: boolean;
  reason: string;
  lenderAmount: [number, number];
  safeAmount: [number, number];
  rateBand: [number, number];
  note?: string;                        // e.g. "Compare this with LAP"
}

export interface RateBand {
  nominalRate: [number, number];         // Quoted rate range
  apr: [number, number];                 // All-in cost (effective annual rate)
  processingFee: [number, number];       // Fee range as percentage
  explanation: string;                   // "Why this rate"
  unknownFactors: string[];              // What widens the range
  confidenceLevel: ConfidenceLevel;
  confidenceExplanation: string;
}

export interface EMIResult {
  recommendedTenureMonths: number;
  emiCeiling: number;                    // Max EMI the borrower should agree to
  emiCeilingReason: string;
  tenureOptions: TenureOption[];
  stressTest: StressTest;
  confidenceLevel: ConfidenceLevel;
  confidenceExplanation: string;
}

export interface TenureOption {
  tenureMonths: number;
  emi: number;
  totalInterest: number;
  totalPayment: number;
  withinSafeCeiling: boolean;
  isRecommended: boolean;
}

export interface StressTest {
  rateRiseEmi: number;                   // EMI if rate rises 2%
  incomeDropSafeEmi: number;             // Safe EMI if income drops 20%
  rateRiseStillAffordable: boolean;
  incomeDropStillAffordable: boolean;
  explanation: string;
}

// ─── Negotiation Card ───────────────────────────────────────────────────────

export interface NegotiationCardData {
  generatedDate: string;
  profile: {
    incomeType: string;
    age?: number;
    scoreBand: string;
  };
  verdict: {
    decision: string;
    reason: string;
  };
  safeAmount: [number, number];
  lenderAmount: [number, number];
  amountAdvice: string;
  fairRate: [number, number];
  fairAPR: [number, number];
  rateReason: string;
  emiCeiling: number;
  emiCeilingReason: string;
  stressSummary: string;
  lenderQuestions: string[];
  comparisonNote?: string;               // vs lender offer if provided
}

// ─── Lender Comparison ──────────────────────────────────────────────────────

export interface LenderComparison {
  offeredRate: number;
  offeredAPR: number;
  fairRateBand: [number, number];
  fairAPRBand: [number, number];
  verdict: 'good_deal' | 'fair' | 'overpaying';
  explanation: string;
  savingsIfFair: number;                 // ₹ saved over tenure if rate were at fair midpoint
}

// ─── Confidence Detail ──────────────────────────────────────────────────────

export interface ConfidenceDetail {
  level: ConfidenceLevel;
  knownFields: string[];
  unknownFields: string[];
  explanation: string;
  widenPct: number;                     // How much ranges are widened
}

// ─── Full Assessment ────────────────────────────────────────────────────────

export interface FullAssessment {
  verdict: Verdict;
  eligibility: Eligibility;
  rateBand: RateBand;
  emiResult: EMIResult;
  negotiationCard: NegotiationCardData;
  lenderComparison?: LenderComparison;
  warnings: string[];
}

// ─── Question Types ─────────────────────────────────────────────────────────

export type QuestionType =
  | 'select'
  | 'number'
  | 'currency'
  | 'range'
  | 'boolean'
  | 'credit_score';

export type QuestionTier = 'must' | 'additional';

export interface QuestionOption {
  value: string;
  label: string;
  description?: string;
}

export interface QuestionDefinition {
  id: string;
  field: keyof BorrowerAnswers;
  tier: QuestionTier;
  type: QuestionType;
  question: string;
  subtitle?: string;
  options?: QuestionOption[];
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  unit?: string;
  showCondition?: (answers: BorrowerAnswers) => boolean;
  skipConsequence?: string;             // Shown when user skips
  affectedOutputs: OutputType[];        // Which outputs this question affects
}
