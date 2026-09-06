/**
 * affordability.ts — FOIR calculation, debt-to-income, safe-carry amount.
 *
 * Uses actual savings months from borrower (not a fixed buffer) and
 * considers productive loan income offset with stress applied.
 */

import {
  FOIR_CAPS,
  INCOME_DISCOUNT,
  PRODUCTIVE_LOAN,
  SAVINGS_THRESHOLDS,
  STRESS,
  type IncomeType,
} from './rules';
import type { BorrowerAnswers } from './types';

/**
 * Determine the effective monthly income that lenders would consider.
 * For self-employed: use ITR income / 12 if available, else apply discount.
 * For informal: apply heavy discount.
 * For salaried: full stated income.
 */
export function getEffectiveIncome(answers: BorrowerAnswers): {
  lenderIncome: number;
  actualIncome: number;
  explanation: string;
} {
  const incomeType = answers.incomeType ?? 'salaried';
  const statedIncome = answers.monthlyIncome ?? 0;

  let lenderIncome: number;
  let explanation: string;

  if (incomeType === 'self_employed' && answers.itrIncome) {
    // Use ITR-based monthly income
    lenderIncome = answers.itrIncome / 12;
    explanation = `Lender uses your ITR income (₹${Math.round(answers.itrIncome).toLocaleString('en-IN')}/year = ₹${Math.round(lenderIncome).toLocaleString('en-IN')}/month)`;
  } else if (incomeType === 'self_employed' && answers.incomeRangeLow) {
    // Use the lower end of stated range
    lenderIncome = answers.incomeRangeLow * INCOME_DISCOUNT[incomeType];
    explanation = `Lender considers ${INCOME_DISCOUNT[incomeType] * 100}% of your lower stated income (₹${answers.incomeRangeLow.toLocaleString('en-IN')})`;
  } else if (incomeType === 'informal' && answers.incomeRangeLow) {
    lenderIncome = answers.incomeRangeLow * INCOME_DISCOUNT[incomeType];
    explanation = `Lender considers only ${INCOME_DISCOUNT[incomeType] * 100}% of your lower stated income because informal income is hard to verify`;
  } else {
    const discount = INCOME_DISCOUNT[incomeType];
    lenderIncome = statedIncome * discount;
    explanation = discount < 1
      ? `Lender considers ${discount * 100}% of your stated income (₹${statedIncome.toLocaleString('en-IN')})`
      : `Lender considers your full stated net income`;
  }

  // For variable income, actual income for safe-carry uses midpoint
  let actualIncome = statedIncome;
  if (answers.incomeRangeLow && answers.incomeRangeHigh) {
    actualIncome = (answers.incomeRangeLow + answers.incomeRangeHigh) / 2;
  }

  return { lenderIncome, actualIncome, explanation };
}

/**
 * Calculate FOIR (Fixed Obligations to Income Ratio).
 * Returns current FOIR and projected FOIR with new EMI.
 */
export function calculateFOIR(
  monthlyIncome: number,
  existingEmis: number,
  newEmi: number
): {
  currentFoir: number;
  projectedFoir: number;
} {
  if (monthlyIncome <= 0) {
    return { currentFoir: 1, projectedFoir: 1 };
  }
  return {
    currentFoir: existingEmis / monthlyIncome,
    projectedFoir: (existingEmis + newEmi) / monthlyIncome,
  };
}

/**
 * Get the FOIR caps for a given income type.
 */
export function getFoirCaps(incomeType: IncomeType): {
  lenderCap: number;
  safeCap: number;
} {
  const caps = FOIR_CAPS[incomeType];
  return { lenderCap: caps.lender, safeCap: caps.safe };
}

/**
 * Calculate the maximum EMI a lender would allow (FOIR-based).
 */
export function getMaxLenderEmi(
  lenderIncome: number,
  existingEmis: number,
  incomeType: IncomeType
): number {
  const { lenderCap } = getFoirCaps(incomeType);
  const maxTotalEmi = lenderIncome * lenderCap;
  return Math.max(0, maxTotalEmi - existingEmis);
}

/**
 * Calculate the safe EMI ceiling based on actual expenses and savings.
 * Uses real data when available instead of fixed assumptions.
 */
export function getSafeEmiCeiling(answers: BorrowerAnswers): {
  safeEmi: number;
  explanation: string;
  components: {
    income: number;
    existingEmis: number;
    expenses: number;
    emergencyBuffer: number;
    productiveOffset: number;
    available: number;
  };
} {
  const { actualIncome } = getEffectiveIncome(answers);
  const existingEmis = answers.existingEmis ?? 0;

  // Use actual expenses if provided, else estimate as percentage of income
  let expenses: number;
  let expenseNote: string;
  if (answers.monthlyExpenses != null && answers.monthlyExpenses > 0) {
    expenses = answers.monthlyExpenses;
    expenseNote = 'your stated monthly expenses';
  } else {
    // Default estimate: 35-50% of income depending on dependents
    const dependentFactor = Math.min(0.15, (answers.dependents ?? 2) * 0.03);
    const baseExpenseRate = 0.35 + dependentFactor;
    expenses = actualIncome * baseExpenseRate;
    expenseNote = 'estimated expenses (answer the expenses question to improve accuracy)';
  }

  // Emergency buffer based on actual savings answer
  let emergencyBuffer: number;
  let bufferNote: string;
  if (answers.emergencySavingsMonths != null) {
    if (answers.emergencySavingsMonths >= SAVINGS_THRESHOLDS.strong) {
      emergencyBuffer = actualIncome * 0.05;  // Minimal buffer needed — strong savings
      bufferNote = `low buffer because you have ${answers.emergencySavingsMonths} months of savings`;
    } else if (answers.emergencySavingsMonths >= SAVINGS_THRESHOLDS.adequate) {
      emergencyBuffer = actualIncome * 0.10;
      bufferNote = `moderate buffer for ${answers.emergencySavingsMonths} months of savings`;
    } else if (answers.emergencySavingsMonths >= SAVINGS_THRESHOLDS.low) {
      emergencyBuffer = actualIncome * 0.15;
      bufferNote = `higher buffer because savings are only ${answers.emergencySavingsMonths} months`;
    } else {
      emergencyBuffer = actualIncome * 0.20;
      bufferNote = `significant buffer because savings are critically low (${answers.emergencySavingsMonths} months)`;
    }
  } else {
    // Unknown savings — use moderate assumption
    emergencyBuffer = actualIncome * 0.12;
    bufferNote = 'estimated buffer (tell us your savings to get a more accurate ceiling)';
  }

  // Upcoming large expenses reduce available amount
  if (answers.upcomingLargeExpenses && answers.upcomingExpenseAmount) {
    // Spread upcoming expense over 12 months as monthly impact
    expenses += answers.upcomingExpenseAmount / 12;
  }

  // Productive loan offset (with stress applied)
  let productiveOffset = 0;
  if (answers.loanWillGenerateIncome && answers.expectedMonthlyIncomeFromLoan) {
    productiveOffset = answers.expectedMonthlyIncomeFromLoan * PRODUCTIVE_LOAN.incomeOffsetFactor;
  }

  const available = actualIncome - existingEmis - expenses - emergencyBuffer + productiveOffset;
  const safeEmi = Math.max(0, available);

  // Build explanation
  const parts: string[] = [
    `Income ₹${Math.round(actualIncome).toLocaleString('en-IN')}`,
    `minus existing EMIs ₹${Math.round(existingEmis).toLocaleString('en-IN')}`,
    `minus ${expenseNote} ₹${Math.round(expenses).toLocaleString('en-IN')}`,
    `minus emergency buffer ₹${Math.round(emergencyBuffer).toLocaleString('en-IN')} (${bufferNote})`,
  ];
  if (productiveOffset > 0) {
    parts.push(`plus stressed productive income offset ₹${Math.round(productiveOffset).toLocaleString('en-IN')}`);
  }
  parts.push(`= available for EMI: ₹${Math.round(safeEmi).toLocaleString('en-IN')}`);

  return {
    safeEmi,
    explanation: parts.join(', '),
    components: {
      income: actualIncome,
      existingEmis,
      expenses,
      emergencyBuffer,
      productiveOffset,
      available: safeEmi,
    },
  };
}

/**
 * Calculate stressed safe EMI (income drops by STRESS.incomeDropPct).
 */
export function getStressedSafeEmi(answers: BorrowerAnswers): number {
  const stressedAnswers: BorrowerAnswers = {
    ...answers,
    monthlyIncome: (answers.monthlyIncome ?? 0) * (1 - STRESS.incomeDropPct),
  };
  if (stressedAnswers.incomeRangeLow) {
    stressedAnswers.incomeRangeLow = stressedAnswers.incomeRangeLow * (1 - STRESS.incomeDropPct);
  }
  if (stressedAnswers.incomeRangeHigh) {
    stressedAnswers.incomeRangeHigh = stressedAnswers.incomeRangeHigh * (1 - STRESS.incomeDropPct);
  }
  // Also reduce productive income expectation under stress
  if (stressedAnswers.expectedMonthlyIncomeFromLoan) {
    stressedAnswers.expectedMonthlyIncomeFromLoan =
      stressedAnswers.expectedMonthlyIncomeFromLoan * (PRODUCTIVE_LOAN.stressedOffsetFactor / PRODUCTIVE_LOAN.incomeOffsetFactor);
  }
  return getSafeEmiCeiling(stressedAnswers).safeEmi;
}

/**
 * Check if the borrower has high-cost existing debt that should be
 * addressed before new borrowing.
 */
export function hasHighCostDebt(answers: BorrowerAnswers): {
  hasHighCost: boolean;
  rate?: number;
  outstanding?: number;
  recommendation?: string;
} {
  // Check from detailed loan info
  if (answers.existingLoanDetails) {
    for (const loan of answers.existingLoanDetails) {
      if (loan.rate && loan.rate >= 20 && loan.outstanding && loan.outstanding >= 10000) {
        return {
          hasHighCost: true,
          rate: loan.rate,
          outstanding: loan.outstanding,
          recommendation: `You have ₹${loan.outstanding.toLocaleString('en-IN')} at ${loan.rate}% interest. Clearing or refinancing this debt first would save you more than new borrowing costs.`,
        };
      }
    }
  }

  // Check from summary fields
  if (answers.existingDebtRate && answers.existingDebtRate >= 20 &&
      answers.existingDebtOutstanding && answers.existingDebtOutstanding >= 10000) {
    return {
      hasHighCost: true,
      rate: answers.existingDebtRate,
      outstanding: answers.existingDebtOutstanding,
      recommendation: `You have ₹${answers.existingDebtOutstanding.toLocaleString('en-IN')} in high-cost debt at ${answers.existingDebtRate}%+. Prioritise clearing this before taking on new debt.`,
    };
  }

  return { hasHighCost: false };
}
