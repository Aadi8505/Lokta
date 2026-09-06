/**
 * confidence.ts — Output-specific confidence calculation.
 *
 * Confidence is NOT based on total questions answered. Instead, each output
 * has a set of relevant fields. Confidence for that output depends on how
 * many of its relevant fields are known.
 *
 * When a field is unknown, only the affected outputs have their ranges
 * widened, and the consequence is explicitly explained.
 */

import {
  CONFIDENCE_FIELDS,
  CONFIDENCE_THRESHOLDS,
  CONFIDENCE_WIDEN_PER_MISSING_FIELD,
  CONFIDENCE_MIN_WIDTH,
  CONFIDENCE_MAX_WIDTH,
  UNKNOWN_PENALTIES,
  type OutputType,
  type ConfidenceLevel,
} from './rules';
import type { BorrowerAnswers, ConfidenceDetail } from './types';

/**
 * Check if a field has a meaningful value in the answers.
 * undefined / 'unknown' / null = not known.
 */
function isFieldKnown(answers: BorrowerAnswers, field: string): boolean {
  const value = (answers as Record<string, unknown>)[field];
  if (value === undefined || value === null) return false;
  if (value === 'unknown') return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  return true;
}

/**
 * Calculate confidence for a specific output.
 * Returns confidence level, known/unknown fields, explanation, and widening %.
 */
export function calculateConfidence(
  answers: BorrowerAnswers,
  output: OutputType
): ConfidenceDetail {
  const relevantFields = CONFIDENCE_FIELDS[output];
  const known: string[] = [];
  const unknown: string[] = [];

  for (const field of relevantFields) {
    if (isFieldKnown(answers, field)) {
      known.push(field);
    } else {
      unknown.push(field);
    }
  }

  const knownRatio = relevantFields.length > 0
    ? known.length / relevantFields.length
    : 1;

  let level: ConfidenceLevel;
  if (knownRatio >= CONFIDENCE_THRESHOLDS.high) {
    level = 'high';
  } else if (knownRatio >= CONFIDENCE_THRESHOLDS.medium) {
    level = 'medium';
  } else {
    level = 'low';
  }

  // Calculate total widening from unknown fields
  let widenPct = 0;
  const consequences: string[] = [];

  for (const field of unknown) {
    const penalty = UNKNOWN_PENALTIES[field];
    if (penalty && penalty.affectedOutputs.includes(output)) {
      widenPct += penalty.widenPct;
      consequences.push(penalty.explanation);
    } else {
      // Generic widening for fields without specific penalty
      widenPct += CONFIDENCE_WIDEN_PER_MISSING_FIELD;
    }
  }

  widenPct = Math.max(CONFIDENCE_MIN_WIDTH, Math.min(CONFIDENCE_MAX_WIDTH, widenPct));

  // Build explanation
  let explanation: string;
  if (level === 'high') {
    explanation = `High confidence: ${known.length} of ${relevantFields.length} relevant inputs provided.`;
  } else if (level === 'medium') {
    explanation = `Moderate confidence: ${unknown.length} relevant input(s) not provided, ranges are wider.`;
  } else {
    explanation = `Low confidence: ${unknown.length} of ${relevantFields.length} relevant inputs missing. Ranges are estimates.`;
  }

  if (consequences.length > 0) {
    explanation += ' ' + consequences[0]; // Show most important consequence
  }

  return {
    level,
    knownFields: known,
    unknownFields: unknown,
    explanation,
    widenPct,
  };
}

/**
 * Apply confidence widening to a numeric range.
 * Widens symmetrically around the midpoint.
 */
export function widenRange(
  range: [number, number],
  widenPct: number
): [number, number] {
  const mid = (range[0] + range[1]) / 2;
  const halfWidth = (range[1] - range[0]) / 2;
  const additionalWidth = mid * widenPct;
  return [
    Math.round(Math.max(0, mid - halfWidth - additionalWidth)),
    Math.round(mid + halfWidth + additionalWidth),
  ];
}

/**
 * Apply confidence widening to a rate range (percentage).
 * Widens by absolute percentage points.
 */
export function widenRateRange(
  range: [number, number],
  widenPct: number
): [number, number] {
  const widening = widenPct * 10; // Convert to percentage points (e.g., 0.15 → 1.5 pp)
  return [
    Math.round(Math.max(0, range[0] - widening / 2) * 100) / 100,
    Math.round((range[1] + widening / 2) * 100) / 100,
  ];
}

/**
 * Get a human-readable confidence label.
 */
export function confidenceLabel(level: ConfidenceLevel): string {
  switch (level) {
    case 'high': return 'Good confidence';
    case 'medium': return 'Reasonable range';
    case 'low': return 'Estimate — answer more questions to narrow';
  }
}
