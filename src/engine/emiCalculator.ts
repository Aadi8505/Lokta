/**
 * emiCalculator.ts — EMI formula, tenure trade-offs, stress tests, and APR.
 *
 * APR is calculated using IRR (Internal Rate of Return) on actual cash flows,
 * not the naive "nominal + fee" approximation. This gives the true cost of
 * the loan as experienced by the borrower.
 */

import { STRESS, PRODUCT_CONFIG, type LoanProduct } from './rules';

/**
 * Standard EMI calculation using the reducing-balance formula.
 * EMI = P × r × (1+r)^n / ((1+r)^n - 1)
 *
 * @param principal Loan amount
 * @param annualRate Annual interest rate as percentage (e.g., 12 for 12%)
 * @param tenureMonths Loan tenure in months
 */
export function calculateEMI(
  principal: number,
  annualRate: number,
  tenureMonths: number
): number {
  if (principal <= 0 || tenureMonths <= 0) return 0;
  if (annualRate <= 0) return principal / tenureMonths;

  const r = annualRate / 100 / 12; // Monthly interest rate
  const n = tenureMonths;
  const emi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return Math.round(emi);
}

/**
 * Calculate total interest paid over the loan tenure.
 */
export function totalInterest(
  principal: number,
  annualRate: number,
  tenureMonths: number
): number {
  const emi = calculateEMI(principal, annualRate, tenureMonths);
  return emi * tenureMonths - principal;
}

/**
 * Calculate the maximum loan principal for a given EMI ceiling.
 * Inverse of the EMI formula: P = EMI × ((1+r)^n - 1) / (r × (1+r)^n)
 */
export function maxPrincipalForEmi(
  maxEmi: number,
  annualRate: number,
  tenureMonths: number
): number {
  if (maxEmi <= 0 || tenureMonths <= 0) return 0;
  if (annualRate <= 0) return maxEmi * tenureMonths;

  const r = annualRate / 100 / 12;
  const n = tenureMonths;
  const principal = (maxEmi * (Math.pow(1 + r, n) - 1)) / (r * Math.pow(1 + r, n));
  return Math.round(principal);
}

/**
 * Generate tenure trade-off table.
 * Shows EMI, total interest, and total payment for each available tenure.
 */
export function tenureTradeoff(
  principal: number,
  annualRate: number,
  product: LoanProduct,
  safeCeiling: number
): Array<{
  tenureMonths: number;
  emi: number;
  totalInterest: number;
  totalPayment: number;
  withinSafeCeiling: boolean;
  isRecommended: boolean;
}> {
  const config = PRODUCT_CONFIG[product];
  const tenures = config.typicalTenureMonths;

  const options = tenures.map((t) => {
    const emi = calculateEMI(principal, annualRate, t);
    const interest = totalInterest(principal, annualRate, t);
    return {
      tenureMonths: t,
      emi,
      totalInterest: interest,
      totalPayment: principal + interest,
      withinSafeCeiling: emi <= safeCeiling,
      isRecommended: false,
    };
  });

  // Recommend the shortest tenure where EMI is within safe ceiling
  const withinCeiling = options.filter((o) => o.withinSafeCeiling);
  if (withinCeiling.length > 0) {
    withinCeiling[0].isRecommended = true;
  } else if (options.length > 0) {
    // If nothing is within ceiling, recommend the longest (lowest EMI)
    options[options.length - 1].isRecommended = true;
  }

  return options;
}

/**
 * Stress test: calculate EMI under adverse scenarios.
 */
export function stressTest(
  principal: number,
  annualRate: number,
  tenureMonths: number,
  safeCeiling: number,
  stressedSafeCeiling: number
): {
  rateRiseEmi: number;
  incomeDropSafeEmi: number;
  rateRiseStillAffordable: boolean;
  incomeDropStillAffordable: boolean;
  explanation: string;
} {
  const rateRiseEmi = calculateEMI(
    principal,
    annualRate + STRESS.rateRiseBps / 100,
    tenureMonths
  );

  const rateRiseAffordable = rateRiseEmi <= safeCeiling;
  const incomeDropAffordable = calculateEMI(principal, annualRate, tenureMonths) <= stressedSafeCeiling;

  const parts: string[] = [];
  if (rateRiseAffordable) {
    parts.push(`If the rate rises by ${STRESS.rateRiseBps / 100}%, your EMI would be ₹${rateRiseEmi.toLocaleString('en-IN')} — still within your safe ceiling`);
  } else {
    parts.push(`If the rate rises by ${STRESS.rateRiseBps / 100}%, your EMI would jump to ₹${rateRiseEmi.toLocaleString('en-IN')} — above your safe ceiling of ₹${safeCeiling.toLocaleString('en-IN')}`);
  }

  if (incomeDropAffordable) {
    parts.push(`Even if your income drops ${STRESS.incomeDropPct * 100}%, you can still cover this EMI`);
  } else {
    parts.push(`If your income drops ${STRESS.incomeDropPct * 100}%, this EMI would become unaffordable`);
  }

  return {
    rateRiseEmi,
    incomeDropSafeEmi: stressedSafeCeiling,
    rateRiseStillAffordable: rateRiseAffordable,
    incomeDropStillAffordable: incomeDropAffordable,
    explanation: parts.join('. ') + '.',
  };
}

/**
 * Calculate APR (Annual Percentage Rate) using IRR on actual cash flows.
 *
 * Cash flows:
 * - At time 0: borrower receives (principal - processingFee)
 * - At time 1..n: borrower pays EMI each month
 *
 * The IRR of these cash flows, annualized, gives the true cost.
 * Uses Newton-Raphson iteration for solving.
 */
export function calculateAPR(
  principal: number,
  annualRate: number,
  tenureMonths: number,
  processingFeePct: number
): number {
  if (principal <= 0 || tenureMonths <= 0) return 0;

  const fee = principal * processingFeePct / 100;
  const disbursed = principal - fee;  // What the borrower actually receives
  const emi = calculateEMI(principal, annualRate, tenureMonths);

  // Cash flows from borrower's perspective:
  // CF[0] = +disbursed (money received)
  // CF[1..n] = -emi (money paid out)
  // We find monthly rate r such that:
  // disbursed = emi * ((1+r)^n - 1) / (r * (1+r)^n)
  // Then APR = (1+r)^12 - 1 (or more commonly r * 12 for nominal APR)

  // Newton-Raphson to find monthly IRR
  let r = annualRate / 100 / 12; // Initial guess: nominal monthly rate

  for (let iteration = 0; iteration < 100; iteration++) {
    const rn = Math.pow(1 + r, tenureMonths);

    // NPV = disbursed - emi * ((1+r)^n - 1) / (r * (1+r)^n)
    const pvAnnuity = (rn - 1) / (r * rn);
    const npv = disbursed - emi * pvAnnuity;

    // Derivative of NPV with respect to r
    // d(pvAnnuity)/dr is complex; use numerical derivative
    const dr = r * 0.0001;
    const rn2 = Math.pow(1 + r + dr, tenureMonths);
    const pvAnnuity2 = (rn2 - 1) / ((r + dr) * rn2);
    const npv2 = disbursed - emi * pvAnnuity2;

    const dNpv = (npv2 - npv) / dr;

    if (Math.abs(dNpv) < 1e-12) break;

    const rNew = r - npv / dNpv;
    if (Math.abs(rNew - r) < 1e-10) {
      r = rNew;
      break;
    }
    r = Math.max(rNew, 0.0001); // Prevent negative rates
  }

  // Convert monthly rate to annual percentage
  const apr = r * 12 * 100;
  return Math.round(apr * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate APR range given rate band and fee range.
 */
export function calculateAPRRange(
  principal: number,
  rateBand: [number, number],
  tenureMonths: number,
  feeRange: [number, number]
): [number, number] {
  // Best case: lowest rate + lowest fee
  const aprLow = calculateAPR(principal, rateBand[0], tenureMonths, feeRange[0]);
  // Worst case: highest rate + highest fee
  const aprHigh = calculateAPR(principal, rateBand[1], tenureMonths, feeRange[1]);
  return [aprLow, aprHigh];
}
