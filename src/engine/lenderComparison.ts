/**
 * lenderComparison.ts — Compare a lender's offer against the borrower's fair range.
 *
 * Takes the lender's quoted rate + processing fee + tenure and compares
 * it to the fair rate/APR band. Provides a verdict and savings estimate.
 */

import { LENDER_COMPARISON, type LoanProduct } from './rules';
import type { BorrowerAnswers, LenderComparison, RateBand } from './types';
import { calculateAPR, calculateEMI, totalInterest } from './emiCalculator';

/**
 * Compare a lender's offer to the borrower's fair rate band.
 */
export function compareLenderOffer(
  answers: BorrowerAnswers,
  fairRateBand: RateBand,
  principal: number
): LenderComparison | null {
  if (!answers.existingLenderOffer || !answers.offeredRate) {
    return null;
  }

  const offeredRate = answers.offeredRate;
  const offeredFee = answers.offeredProcessingFee ?? 0;
  const offeredTenure = answers.offeredTenureMonths ?? 36;

  // Calculate the APR for the lender's offer
  const offeredAPR = calculateAPR(principal, offeredRate, offeredTenure, offeredFee);

  // Fair rate midpoint
  const fairMid = (fairRateBand.nominalRate[0] + fairRateBand.nominalRate[1]) / 2;
  const fairAPRMid = (fairRateBand.apr[0] + fairRateBand.apr[1]) / 2;

  // Compare
  const diffBps = (offeredRate - fairMid) * 100; // Basis points above/below fair

  let verdict: 'good_deal' | 'fair' | 'overpaying';
  let explanation: string;

  if (diffBps <= LENDER_COMPARISON.goodDealThresholdBps) {
    verdict = 'good_deal';
    explanation = `The offered rate of ${offeredRate}% is ${Math.abs(diffBps / 100).toFixed(1)}% below the midpoint of your fair range (${fairRateBand.nominalRate[0]}–${fairRateBand.nominalRate[1]}%). This is a competitive offer.`;
  } else if (diffBps <= LENDER_COMPARISON.fairDealThresholdBps) {
    verdict = 'fair';
    explanation = `The offered rate of ${offeredRate}% is within your fair range (${fairRateBand.nominalRate[0]}–${fairRateBand.nominalRate[1]}%). This is a reasonable offer.`;
  } else {
    verdict = 'overpaying';
    explanation = `The offered rate of ${offeredRate}% is ${(diffBps / 100).toFixed(1)}% above the midpoint of your fair range (${fairRateBand.nominalRate[0]}–${fairRateBand.nominalRate[1]}%). You're likely overpaying.`;
  }

  // Add APR comparison
  if (offeredFee > 0) {
    explanation += ` With the ${offeredFee}% processing fee, the real cost (APR) is ${offeredAPR.toFixed(1)}%, compared to a fair APR range of ${fairRateBand.apr[0].toFixed(1)}–${fairRateBand.apr[1].toFixed(1)}%.`;
  }

  // Calculate savings over tenure if rate were at fair midpoint
  const offeredTotalInterest = totalInterest(principal, offeredRate, offeredTenure);
  const fairTotalInterest = totalInterest(principal, fairMid, offeredTenure);
  const savings = offeredTotalInterest - fairTotalInterest;

  if (savings > 0) {
    explanation += ` Negotiating to ${fairMid.toFixed(1)}% could save you ₹${Math.round(savings).toLocaleString('en-IN')} over ${offeredTenure} months.`;
  }

  return {
    offeredRate,
    offeredAPR,
    fairRateBand: fairRateBand.nominalRate,
    fairAPRBand: fairRateBand.apr,
    verdict,
    explanation,
    savingsIfFair: Math.max(0, Math.round(savings)),
  };
}
