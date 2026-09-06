/**
 * helpers.ts — Formatting utilities for the UI.
 */

/**
 * Format a number as Indian rupees (lakh/crore notation).
 */
export function formatRupees(amount: number, compact = false): string {
  if (compact) {
    if (amount >= 1_00_00_000) {
      return `₹${(amount / 1_00_00_000).toFixed(1)} Cr`;
    }
    if (amount >= 1_00_000) {
      return `₹${(amount / 1_00_000).toFixed(1)} L`;
    }
    if (amount >= 1_000) {
      return `₹${(amount / 1_000).toFixed(1)}K`;
    }
  }
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

/**
 * Format a range of rupees.
 */
export function formatRupeeRange(low: number, high: number, compact = false): string {
  if (Math.abs(low - high) < 1000) {
    return formatRupees(low, compact);
  }
  return `${formatRupees(low, compact)} – ${formatRupees(high, compact)}`;
}

/**
 * Format a percentage range.
 */
export function formatPctRange(low: number, high: number): string {
  if (Math.abs(low - high) < 0.1) {
    return `${low.toFixed(1)}%`;
  }
  return `${low.toFixed(1)}% – ${high.toFixed(1)}%`;
}
