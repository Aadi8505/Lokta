/**
 * rateEngine.ts — Fair rate band lookup and APR calculation.
 *
 * Determines the fair interest rate band for a borrower profile,
 * applying income-type premiums and handling unknown credit scores
 * by widening (not penalising).
 */

import {
  RATE_GRID,
  INCOME_TYPE_RATE_PREMIUM,
  PROCESSING_FEE_RANGE,
  CONFIDENCE_FIELDS,
  UNKNOWN_PENALTIES,
  type LoanProduct,
  type CreditScoreBand,
  type IncomeType,
} from './rules';
import type { BorrowerAnswers, RateBand } from './types';
import { calculateAPRRange } from './emiCalculator';
import { calculateConfidence } from './confidence';

/**
 * Map a numeric credit score to a band.
 * Returns 'unknown' if score is not provided or explicitly unknown.
 */
export function scoreToBand(score: number | 'unknown' | undefined): CreditScoreBand {
  if (score === undefined || score === 'unknown') return 'unknown';
  if (score >= 750) return '750+';
  if (score >= 700) return '700-749';
  if (score >= 650) return '650-699';
  return 'below_650';
}

/**
 * Get the base rate band for a product and credit score.
 */
export function getBaseRateBand(
  product: LoanProduct,
  scoreBand: CreditScoreBand
): [number, number] {
  return [...RATE_GRID[product][scoreBand]] as [number, number];
}

/**
 * Apply income-type premium to rate band.
 */
export function applyIncomeTypePremium(
  rateBand: [number, number],
  incomeType: IncomeType
): [number, number] {
  const premium = INCOME_TYPE_RATE_PREMIUM[incomeType];
  return [
    Math.round((rateBand[0] + premium) * 100) / 100,
    Math.round((rateBand[1] + premium) * 100) / 100,
  ];
}

/**
 * Apply stability adjustment based on years in job/business.
 * Longer tenure narrows the band (toward lower end).
 */
function applyStabilityAdjustment(
  rateBand: [number, number],
  yearsInJob: number | undefined,
  incomeType: IncomeType
): { band: [number, number]; note: string } {
  if (yearsInJob === undefined) {
    return { band: rateBand, note: '' };
  }

  let adjustment = 0;
  let note = '';

  if (incomeType === 'salaried') {
    if (yearsInJob >= 5) {
      adjustment = -0.5; // 50bps benefit for 5+ years
      note = '5+ years at current job improves your rate';
    } else if (yearsInJob >= 2) {
      adjustment = -0.25;
      note = '2+ years at current job helps slightly';
    }
  } else {
    // Self-employed / informal: longer business history helps more
    if (yearsInJob >= 10) {
      adjustment = -1.0;
      note = '10+ years in business significantly improves your rate';
    } else if (yearsInJob >= 5) {
      adjustment = -0.5;
      note = '5+ years in business improves your rate';
    } else if (yearsInJob < 2) {
      adjustment = 0.5;
      note = 'Less than 2 years in business may increase your rate';
    }
  }

  return {
    band: [
      Math.round((rateBand[0] + adjustment) * 100) / 100,
      Math.round((rateBand[1] + adjustment) * 100) / 100,
    ],
    note,
  };
}

/**
 * Apply bounce penalty to rate band.
 */
function applyBouncePenalty(
  rateBand: [number, number],
  emiBounces: number | undefined
): { band: [number, number]; note: string } {
  if (emiBounces === undefined || emiBounces === 0) {
    return { band: rateBand, note: '' };
  }

  const penalty = Math.min(emiBounces * 1.0, 3.0); // Up to 300bps
  return {
    band: [
      Math.round((rateBand[0] + penalty) * 100) / 100,
      Math.round((rateBand[1] + penalty) * 100) / 100,
    ],
    note: `${emiBounces} EMI bounce(s) in the last year adds ${penalty}% to your expected rate`,
  };
}

/**
 * Get the full rate band for a borrower, with explanations.
 */
export function getRateBand(
  answers: BorrowerAnswers,
  product: LoanProduct,
  tenureMonths: number,
  principal: number
): RateBand {
  const incomeType = answers.incomeType ?? 'salaried';
  const scoreBand = scoreToBand(answers.creditScore);

  // Step 1: Base rate from grid
  let band = getBaseRateBand(product, scoreBand);

  // Step 2: Income type premium
  band = applyIncomeTypePremium(band, incomeType);

  // Step 3: Stability adjustment
  const stability = applyStabilityAdjustment(band, answers.yearsInJob, incomeType);
  band = stability.band;

  // Step 4: Bounce penalty
  const bounce = applyBouncePenalty(band, answers.emiBounces);
  band = bounce.band;

  // Ensure min < max
  band = [Math.min(band[0], band[1]), Math.max(band[0], band[1])];

  // Processing fee range for this product
  const feeRange = PROCESSING_FEE_RANGE[product];

  // Calculate APR using actual cash flows (IRR method)
  const aprRange = calculateAPRRange(principal, band, tenureMonths, feeRange);

  // Build explanation
  const explanationParts: string[] = [];
  explanationParts.push(
    `Base rate for ${product.replace('_', ' ')} loans with ${scoreBand === 'unknown' ? 'unknown' : scoreBand} credit score`
  );
  if (INCOME_TYPE_RATE_PREMIUM[incomeType] > 0) {
    explanationParts.push(
      `${incomeType.replace('_', '-')} income adds ${INCOME_TYPE_RATE_PREMIUM[incomeType]}% premium`
    );
  }
  if (stability.note) explanationParts.push(stability.note);
  if (bounce.note) explanationParts.push(bounce.note);

  // Unknown factors
  const unknownFactors: string[] = [];
  if (scoreBand === 'unknown') {
    unknownFactors.push(UNKNOWN_PENALTIES.creditScore.explanation);
  }
  if (answers.yearsInJob === undefined) {
    unknownFactors.push(UNKNOWN_PENALTIES.yearsInJob.explanation);
  }

  // Confidence
  const conf = calculateConfidence(answers, 'rate');

  return {
    nominalRate: band,
    apr: aprRange,
    processingFee: feeRange,
    explanation: explanationParts.join('. ') + '.',
    unknownFactors,
    confidenceLevel: conf.level,
    confidenceExplanation: conf.explanation,
  };
}

/**
 * Get a display label for a credit score band.
 */
export function scoreBandLabel(band: CreditScoreBand): string {
  switch (band) {
    case '750+': return 'Excellent (750+)';
    case '700-749': return 'Good (700–749)';
    case '650-699': return 'Fair (650–699)';
    case 'below_650': return 'Below 650';
    case 'unknown': return 'Not known';
  }
}
