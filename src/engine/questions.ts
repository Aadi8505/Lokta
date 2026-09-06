/**
 * questions.ts — Question definitions with adaptive show-conditions.
 *
 * Must questions (tier: 'must'): minimum to produce all four outputs.
 * Additional questions (tier: 'additional'): each one tightens a range.
 * Every question declares which outputs it affects.
 */

import type { QuestionDefinition } from './types';
import type { BorrowerAnswers } from './types';

export const QUESTIONS: QuestionDefinition[] = [
  // ═══ MUST QUESTIONS ═══════════════════════════════════════════════════════

  {
    id: 'loanPurpose',
    field: 'loanPurpose',
    tier: 'must',
    type: 'select',
    question: 'What do you need the loan for?',
    subtitle: 'This determines which loan products suit you best.',
    options: [
      { value: 'wedding', label: 'Wedding / Family event' },
      { value: 'home_purchase', label: 'Buying a home' },
      { value: 'home_renovation', label: 'Home renovation' },
      { value: 'vehicle', label: 'Vehicle (two-wheeler / car)' },
      { value: 'business_expansion', label: 'Business expansion / stock' },
      { value: 'business_vehicle', label: 'Business vehicle / equipment' },
      { value: 'education', label: 'Education' },
      { value: 'medical', label: 'Medical expenses' },
      { value: 'debt_consolidation', label: 'Consolidate / repay existing loans' },
      { value: 'consumer_durable', label: 'Electronics / appliance' },
      { value: 'other', label: 'Other' },
    ],
    affectedOutputs: ['verdict', 'eligibility', 'rate', 'emi'],
  },

  {
    id: 'amountWanted',
    field: 'amountWanted',
    tier: 'must',
    type: 'currency',
    question: 'How much do you want to borrow?',
    subtitle: 'Enter the amount in rupees. We\'ll tell you if it\'s realistic.',
    min: 10000,
    max: 50000000,
    step: 10000,
    placeholder: 'e.g., 5,00,000',
    unit: '₹',
    affectedOutputs: ['verdict', 'eligibility', 'rate', 'emi'],
  },

  {
    id: 'monthlyIncome',
    field: 'monthlyIncome',
    tier: 'must',
    type: 'currency',
    question: 'What is your net monthly income?',
    subtitle: 'Take-home after tax. If it varies, enter your average.',
    min: 5000,
    max: 10000000,
    step: 1000,
    placeholder: 'e.g., 60,000',
    unit: '₹',
    affectedOutputs: ['verdict', 'eligibility', 'rate', 'emi'],
  },

  {
    id: 'incomeType',
    field: 'incomeType',
    tier: 'must',
    type: 'select',
    question: 'What type of income do you earn?',
    subtitle: 'This significantly affects how lenders view your application.',
    options: [
      { value: 'salaried', label: 'Salaried', description: 'Regular salary from an employer' },
      { value: 'self_employed', label: 'Self-employed / Business owner', description: 'Own business, freelance, or professional practice' },
      { value: 'informal', label: 'Informal / Gig / Cash-based', description: 'Platform work, daily wages, cash income' },
    ],
    affectedOutputs: ['verdict', 'eligibility', 'rate', 'emi'],
  },

  {
    id: 'existingEmis',
    field: 'existingEmis',
    tier: 'must',
    type: 'currency',
    question: 'What are your total existing EMIs per month?',
    subtitle: 'Include all loan EMIs, app loan payments, and credit card minimum dues. Enter 0 if none.',
    min: 0,
    max: 5000000,
    step: 500,
    placeholder: 'e.g., 14,000',
    unit: '₹',
    affectedOutputs: ['verdict', 'eligibility', 'emi'],
  },

  {
    id: 'monthlyExpenses',
    field: 'monthlyExpenses',
    tier: 'must',
    type: 'currency',
    question: 'What are your monthly household expenses?',
    subtitle: 'Rent, groceries, utilities, school fees, transport — everything except EMIs.',
    min: 3000,
    max: 5000000,
    step: 1000,
    placeholder: 'e.g., 35,000',
    unit: '₹',
    skipConsequence: 'We\'ll estimate your expenses, which may make your EMI ceiling less accurate.',
    affectedOutputs: ['verdict', 'emi'],
  },

  {
    id: 'age',
    field: 'age',
    tier: 'must',
    type: 'number',
    question: 'How old are you?',
    subtitle: 'Age affects the maximum loan tenure available to you.',
    min: 18,
    max: 70,
    step: 1,
    placeholder: 'e.g., 32',
    affectedOutputs: ['rate', 'emi'],
  },

  {
    id: 'creditScore',
    field: 'creditScore',
    tier: 'must',
    type: 'credit_score',
    question: 'What is your credit score (CIBIL)?',
    subtitle: 'Check on cibil.com for ₹550. If you don\'t know, that\'s fine — we\'ll show wider ranges.',
    min: 300,
    max: 900,
    placeholder: 'e.g., 750',
    skipConsequence: 'Your rate range will be wider. Getting your score (₹550 on cibil.com) could narrow it by 3–5%.',
    affectedOutputs: ['eligibility', 'rate'],
  },

  // ═══ ADDITIONAL QUESTIONS ═════════════════════════════════════════════════

  {
    id: 'incomeRange',
    field: 'incomeRangeLow',
    tier: 'additional',
    type: 'range',
    question: 'What is your income range — worst month to best month?',
    subtitle: 'This helps us account for income variability in your EMI ceiling.',
    min: 5000,
    max: 10000000,
    step: 1000,
    unit: '₹',
    showCondition: (a: BorrowerAnswers) =>
      a.incomeType === 'self_employed' || a.incomeType === 'informal',
    skipConsequence: 'We\'ll assume moderate variability, which widens your safe EMI range.',
    affectedOutputs: ['verdict', 'eligibility', 'emi'],
  },

  {
    id: 'incomeVariability',
    field: 'incomeVariability',
    tier: 'additional',
    type: 'select',
    question: 'How stable is your income month to month?',
    subtitle: 'This affects how much EMI risk you can handle.',
    options: [
      { value: 'stable', label: 'Stable', description: 'Same every month, ±10%' },
      { value: 'seasonal', label: 'Seasonal', description: 'Varies by season but predictable' },
      { value: 'volatile', label: 'Volatile', description: 'Varies a lot, hard to predict' },
    ],
    showCondition: (a: BorrowerAnswers) =>
      a.incomeType === 'self_employed' || a.incomeType === 'informal',
    skipConsequence: 'We\'ll assume moderate variability.',
    affectedOutputs: ['verdict', 'emi'],
  },

  {
    id: 'yearsInJob',
    field: 'yearsInJob',
    tier: 'additional',
    type: 'number',
    question: (answers: BorrowerAnswers) =>
      answers.incomeType === 'salaried'
        ? 'How many years have you been in your current job?'
        : 'How many years have you been running your business?',
    subtitle: 'Longer tenure improves your rate and eligibility.',
    min: 0,
    max: 50,
    step: 1,
    placeholder: 'e.g., 5',
    affectedOutputs: ['eligibility', 'rate'],
  } as QuestionDefinition,

  {
    id: 'itrFiled',
    field: 'itrFiled',
    tier: 'additional',
    type: 'boolean',
    question: 'Have you filed an Income Tax Return (ITR)?',
    subtitle: 'ITR documentation significantly improves lender confidence and your eligible amount.',
    showCondition: (a: BorrowerAnswers) => a.incomeType === 'self_employed',
    affectedOutputs: ['eligibility'],
  },

  {
    id: 'itrIncome',
    field: 'itrIncome',
    tier: 'additional',
    type: 'currency',
    question: 'What is your annual income as per your last ITR?',
    subtitle: 'Lenders use ITR income, not stated income, for eligibility.',
    min: 0,
    max: 100000000,
    step: 10000,
    placeholder: 'e.g., 4,20,000',
    unit: '₹',
    showCondition: (a: BorrowerAnswers) => a.incomeType === 'self_employed' && a.itrFiled === true,
    skipConsequence: 'Your eligible amount will be based on discounted stated income.',
    affectedOutputs: ['eligibility'],
  },

  {
    id: 'collateralAvailable',
    field: 'collateralAvailable',
    tier: 'additional',
    type: 'boolean',
    question: 'Do you own any property or gold you could offer as collateral?',
    subtitle: 'Collateral unlocks secured loans at much lower rates.',
    showCondition: (a: BorrowerAnswers) => {
      // Show for self-employed, informal, or high amounts
      const isNonSalaried = a.incomeType === 'self_employed' || a.incomeType === 'informal';
      const isHighAmount = (a.amountWanted ?? 0) > 5_00_000;
      return isNonSalaried || isHighAmount;
    },
    affectedOutputs: ['eligibility', 'rate'],
  },

  {
    id: 'collateralValue',
    field: 'collateralValue',
    tier: 'additional',
    type: 'currency',
    question: 'What is the approximate value of your property/gold?',
    subtitle: 'Market value. This determines LTV and secured loan eligibility.',
    min: 0,
    max: 500000000,
    step: 50000,
    placeholder: 'e.g., 45,00,000',
    unit: '₹',
    showCondition: (a: BorrowerAnswers) => a.collateralAvailable === true,
    affectedOutputs: ['eligibility', 'rate'],
  },

  {
    id: 'emiBounces',
    field: 'emiBounces',
    tier: 'additional',
    type: 'number',
    question: 'How many EMI payments have bounced in the last 12 months?',
    subtitle: 'Be honest — bounces affect your rate and eligibility. Enter 0 if none.',
    min: 0,
    max: 24,
    step: 1,
    placeholder: '0',
    showCondition: (a: BorrowerAnswers) => (a.existingEmis ?? 0) > 0,
    affectedOutputs: ['verdict', 'rate'],
  },

  {
    id: 'existingDebtRate',
    field: 'existingDebtRate',
    tier: 'additional',
    type: 'number',
    question: 'What is the interest rate on your most expensive existing loan?',
    subtitle: 'If you have app loans or credit card debt, this could be 20–40%. Enter as a number (e.g., 30 for 30%).',
    min: 0,
    max: 100,
    step: 0.5,
    placeholder: 'e.g., 30',
    unit: '%',
    showCondition: (a: BorrowerAnswers) => (a.existingEmis ?? 0) > 0,
    affectedOutputs: ['verdict'],
  },

  {
    id: 'existingDebtOutstanding',
    field: 'existingDebtOutstanding',
    tier: 'additional',
    type: 'currency',
    question: 'How much is outstanding on your highest-rate loan?',
    subtitle: 'The remaining balance on your most expensive debt.',
    min: 0,
    max: 50000000,
    step: 1000,
    placeholder: 'e.g., 35,000',
    unit: '₹',
    showCondition: (a: BorrowerAnswers) =>
      (a.existingDebtRate ?? 0) >= 15 && (a.existingEmis ?? 0) > 0,
    affectedOutputs: ['verdict'],
  },

  {
    id: 'emergencySavingsMonths',
    field: 'emergencySavingsMonths',
    tier: 'additional',
    type: 'number',
    question: 'How many months of expenses could you cover from your savings?',
    subtitle: 'If you lost all income tomorrow, how many months could you survive?',
    min: 0,
    max: 60,
    step: 1,
    placeholder: 'e.g., 3',
    skipConsequence: 'We\'ll assume a moderate emergency buffer, which may overestimate your safe EMI.',
    affectedOutputs: ['verdict', 'emi'],
  },

  {
    id: 'dependents',
    field: 'dependents',
    tier: 'additional',
    type: 'number',
    question: 'How many dependents do you support?',
    subtitle: 'Children, elderly parents, non-earning spouse — anyone relying on your income.',
    min: 0,
    max: 15,
    step: 1,
    placeholder: 'e.g., 2',
    affectedOutputs: ['emi'],
  },

  {
    id: 'coApplicant',
    field: 'coApplicantAvailable',
    tier: 'additional',
    type: 'boolean',
    question: 'Can someone co-apply with you (spouse, family member)?',
    subtitle: 'A co-applicant\'s income can increase your eligible amount and improve your rate.',
    affectedOutputs: ['eligibility'],
  },

  {
    id: 'coApplicantIncome',
    field: 'coApplicantIncome',
    tier: 'additional',
    type: 'currency',
    question: 'What is your co-applicant\'s monthly income?',
    min: 0,
    max: 10000000,
    step: 1000,
    placeholder: 'e.g., 18,000',
    unit: '₹',
    showCondition: (a: BorrowerAnswers) => a.coApplicantAvailable === true,
    affectedOutputs: ['eligibility'],
  },

  {
    id: 'upcomingExpenses',
    field: 'upcomingLargeExpenses',
    tier: 'additional',
    type: 'boolean',
    question: 'Do you have any large expenses coming up in the next 12 months?',
    subtitle: 'Wedding, medical, renovation — anything above ₹50,000.',
    affectedOutputs: ['verdict', 'emi'],
  },

  {
    id: 'upcomingExpenseAmount',
    field: 'upcomingExpenseAmount',
    tier: 'additional',
    type: 'currency',
    question: 'How much are these upcoming expenses?',
    min: 10000,
    max: 50000000,
    step: 10000,
    placeholder: 'e.g., 2,00,000',
    unit: '₹',
    showCondition: (a: BorrowerAnswers) => a.upcomingLargeExpenses === true,
    affectedOutputs: ['verdict', 'emi'],
  },

  {
    id: 'productiveLoan',
    field: 'loanWillGenerateIncome',
    tier: 'additional',
    type: 'boolean',
    question: 'Will this loan directly help you earn more money?',
    subtitle: 'e.g., business stock, a vehicle for delivery work, equipment',
    showCondition: (a: BorrowerAnswers) =>
      a.loanPurpose === 'business_expansion' ||
      a.loanPurpose === 'business_vehicle' ||
      a.loanPurpose === 'vehicle',
    affectedOutputs: ['verdict', 'emi'],
  },

  {
    id: 'expectedIncome',
    field: 'expectedMonthlyIncomeFromLoan',
    tier: 'additional',
    type: 'currency',
    question: 'How much extra income per month do you expect this loan to generate?',
    subtitle: 'Be conservative. We\'ll stress-test this number too.',
    min: 0,
    max: 5000000,
    step: 1000,
    placeholder: 'e.g., 8,000',
    unit: '₹',
    showCondition: (a: BorrowerAnswers) => a.loanWillGenerateIncome === true,
    affectedOutputs: ['verdict', 'emi'],
  },

  {
    id: 'existingOffer',
    field: 'existingLenderOffer',
    tier: 'additional',
    type: 'boolean',
    question: 'Have you already received a loan offer from a lender?',
    subtitle: 'We\'ll compare it against your fair rate to see if it\'s a good deal.',
    affectedOutputs: ['rate'],
  },

  {
    id: 'offeredRate',
    field: 'offeredRate',
    tier: 'additional',
    type: 'number',
    question: 'What interest rate were you offered?',
    subtitle: 'The annual rate quoted by the lender (e.g., 12.5%).',
    min: 1,
    max: 50,
    step: 0.1,
    placeholder: 'e.g., 12.5',
    unit: '%',
    showCondition: (a: BorrowerAnswers) => a.existingLenderOffer === true,
    affectedOutputs: ['rate'],
  },

  {
    id: 'offeredFee',
    field: 'offeredProcessingFee',
    tier: 'additional',
    type: 'number',
    question: 'What processing fee was quoted?',
    subtitle: 'As a percentage of the loan amount (e.g., 2 for 2%).',
    min: 0,
    max: 10,
    step: 0.1,
    placeholder: 'e.g., 2',
    unit: '%',
    showCondition: (a: BorrowerAnswers) => a.existingLenderOffer === true,
    affectedOutputs: ['rate'],
  },

  {
    id: 'offeredTenure',
    field: 'offeredTenureMonths',
    tier: 'additional',
    type: 'number',
    question: 'What tenure (in months) was offered?',
    subtitle: 'The repayment period in the offer.',
    min: 3,
    max: 360,
    step: 1,
    placeholder: 'e.g., 36',
    showCondition: (a: BorrowerAnswers) => a.existingLenderOffer === true,
    affectedOutputs: ['emi'],
  },
];

/**
 * Get questions for the current state, filtered by show conditions.
 */
export function getVisibleQuestions(
  answers: BorrowerAnswers,
  tier?: 'must' | 'additional'
): QuestionDefinition[] {
  return QUESTIONS.filter(q => {
    if (tier && q.tier !== tier) return false;
    if (q.showCondition && !q.showCondition(answers)) return false;
    return true;
  });
}

/**
 * Get the next unanswered question.
 */
export function getNextQuestion(
  answers: BorrowerAnswers,
  tier?: 'must' | 'additional'
): QuestionDefinition | null {
  const visible = getVisibleQuestions(answers, tier);
  for (const q of visible) {
    const value = (answers as Record<string, unknown>)[q.field];
    if (value === undefined || value === null) {
      return q;
    }
  }
  return null;
}

/**
 * Get progress for a tier.
 */
export function getProgress(
  answers: BorrowerAnswers,
  tier: 'must' | 'additional'
): { answered: number; total: number; percentage: number } {
  const visible = getVisibleQuestions(answers, tier);
  let answered = 0;
  for (const q of visible) {
    const value = (answers as Record<string, unknown>)[q.field];
    if (value !== undefined && value !== null) {
      answered++;
    }
  }
  return {
    answered,
    total: visible.length,
    percentage: visible.length > 0 ? Math.round((answered / visible.length) * 100) : 100,
  };
}
