/**
 * ResultsDashboard.tsx — Displays all four outputs with explanations.
 */

import { useBorrower } from '../context/BorrowerContext';
import { runAssessment } from '../engine/assessment';
import { formatRupees, formatRupeeRange, formatPctRange } from '../helpers';
import type { FullAssessment, TenureOption } from '../engine/types';

export function ResultsDashboard() {
  const { state, dispatch } = useBorrower();

  // Ensure we have an assessment
  const assessment: FullAssessment = state.assessment ?? runAssessment(state.answers);

  const { verdict, eligibility, rateBand, emiResult, lenderComparison } = assessment;

  const verdictColors: Record<string, string> = {
    borrow: 'green',
    borrow_less: 'amber',
    dont_borrow: 'red',
  };

  const verdictLabels: Record<string, string> = {
    borrow: '✓ Go ahead and borrow',
    borrow_less: '⚠ Consider borrowing less',
    dont_borrow: '✗ Don\'t borrow right now',
  };

  return (
    <div className="results">
      <div className="results__header">
        <h1 className="results__title">Your Assessment</h1>
        <p className="results__subtitle">
          Based on your answers • All numbers are estimates
        </p>
      </div>

      <div className="results__grid">
        {/* ═══ EXECUTIVE KPI SUMMARY ROW ═══ */}
        <div className="kpi-grid">
          <div className="kpi-card">
            <span className="kpi-card__label">Decision</span>
            <span className={`kpi-card__value kpi-card__value--${verdictColors[verdict.decision]}`}>
              {verdict.decision === 'borrow' ? 'Borrow' : verdict.decision === 'borrow_less' ? 'Borrow Less' : 'Don\'t Borrow'}
            </span>
            <span className="kpi-card__sub">{verdict.confidenceLevel.toUpperCase()} CONFIDENCE</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-card__label">Safe Carry Ceiling</span>
            <span className="kpi-card__value" style={{ color: 'var(--accent-green)' }}>
              {formatRupeeRange(eligibility.safeCarryAmount[0], eligibility.safeCarryAmount[1], true)}
            </span>
            <span className="kpi-card__sub">Lender max: {formatRupeeRange(eligibility.lenderLikelyAmount[0], eligibility.lenderLikelyAmount[1], true)}</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-card__label">Fair Rate (Nominal)</span>
            <span className="kpi-card__value" style={{ color: 'var(--accent-gold)' }}>
              {formatPctRange(rateBand.nominalRate[0], rateBand.nominalRate[1])}
            </span>
            <span className="kpi-card__sub">True APR: {formatPctRange(rateBand.apr[0], rateBand.apr[1])}</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-card__label">Monthly EMI Ceiling</span>
            <span className="kpi-card__value" style={{ color: 'var(--accent-gold)' }}>
              {formatRupees(emiResult.emiCeiling)}/mo
            </span>
            <span className="kpi-card__sub">
              {emiResult.stressTest.rateRiseStillAffordable && emiResult.stressTest.incomeDropStillAffordable
                ? 'Resilient to +200bps / -20%'
                : 'Vulnerable to shocks'}
            </span>
          </div>
        </div>

        {/* ═══ O1: VERDICT ═══ */}
        <div className="card result-card result-card--verdict">
          <div className="result-card__header">
            <span className="result-card__label">Should you borrow?</span>
            <ConfidenceBadge level={verdict.confidenceLevel} />
          </div>
          <div className={`result-card__value result-card__value--${verdictColors[verdict.decision]}`}>
            {verdictLabels[verdict.decision]}
          </div>
          <p className="result-card__reason">{verdict.reason}</p>

          {verdict.details.length > 0 && (
            <div className="result-card__details">
              {verdict.details.map((d, i) => (
                <div key={i} className="result-card__detail-item">{d}</div>
              ))}
            </div>
          )}

          {verdict.debtFirstRecommendation && (
            <div className="info-sentence" style={{ marginTop: 'var(--space-md)' }}>
              <span className="info-sentence__icon">💡</span>
              <span>{verdict.debtFirstRecommendation}</span>
            </div>
          )}

          <div className="info-sentence" style={{ marginTop: 'var(--space-md)' }}>
            <span className="info-sentence__icon">ℹ</span>
            <span>{verdict.confidenceExplanation}</span>
          </div>
        </div>

        {/* ═══ O2: ELIGIBILITY ═══ */}
        <div className="card result-card result-card--eligibility">
          <div className="result-card__header">
            <span className="result-card__label">How much can you borrow?</span>
            <ConfidenceBadge level={eligibility.confidenceLevel} />
          </div>

          <div className="amount-comparison">
            <div className="amount-comparison__item">
              <div className="amount-comparison__label">Lender may approve</div>
              <div className="amount-comparison__value amount-comparison__value--lender">
                {formatRupeeRange(eligibility.lenderLikelyAmount[0], eligibility.lenderLikelyAmount[1], true)}
              </div>
            </div>
            <div className="amount-comparison__item">
              <div className="amount-comparison__label">You can safely carry</div>
              <div className="amount-comparison__value amount-comparison__value--safe">
                {formatRupeeRange(eligibility.safeCarryAmount[0], eligibility.safeCarryAmount[1], true)}
              </div>
            </div>
          </div>

          <p className="result-card__reason">{eligibility.recommendationReason}</p>

          {/* Product comparison if multiple */}
          {eligibility.applicableProducts.length > 1 && (
            <div style={{ marginTop: 'var(--space-md)' }}>
              <div className="result-card__label" style={{ marginBottom: 'var(--space-sm)' }}>
                Compare your options
              </div>
              {eligibility.applicableProducts.map(p => (
                <div key={p.product} className="info-sentence" style={{ marginBottom: 'var(--space-sm)' }}>
                  <span className="info-sentence__icon">
                    {p.eligible ? '✓' : '✗'}
                  </span>
                  <span>
                    <strong>{p.label}</strong>: {p.reason}
                    {p.note && <><br/><em style={{ color: 'var(--accent-gold)' }}>{p.note}</em></>}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="info-sentence" style={{ marginTop: 'var(--space-md)' }}>
            <span className="info-sentence__icon">ℹ</span>
            <span>
              <strong>Why this amount?</strong> {eligibility.explanations.lenderAmount}
            </span>
          </div>
        </div>

        {/* ═══ O3: RATE ═══ */}
        <div className="card result-card result-card--rate">
          <div className="result-card__header">
            <span className="result-card__label">Fair interest rate</span>
            <ConfidenceBadge level={rateBand.confidenceLevel} />
          </div>

          <div className="rate-display">
            <div className="rate-display__item">
              <div className="rate-display__label">Quoted Rate</div>
              <div className="rate-display__value">
                {formatPctRange(rateBand.nominalRate[0], rateBand.nominalRate[1])}
              </div>
            </div>
            <div className="rate-display__item">
              <div className="rate-display__label">All-in Cost (APR)</div>
              <div className="rate-display__value">
                {formatPctRange(rateBand.apr[0], rateBand.apr[1])}
              </div>
            </div>
          </div>

          <p className="result-card__reason">{rateBand.explanation}</p>

          {rateBand.unknownFactors.length > 0 && (
            <div style={{ marginTop: 'var(--space-md)' }}>
              {rateBand.unknownFactors.map((f, i) => (
                <div key={i} className="info-sentence" style={{ marginBottom: 'var(--space-sm)' }}>
                  <span className="info-sentence__icon">⚠</span>
                  <span>{f}</span>
                </div>
              ))}
            </div>
          )}

          <div className="info-sentence" style={{ marginTop: 'var(--space-md)' }}>
            <span className="info-sentence__icon">💡</span>
            <span>
              The APR is the true cost — it includes processing fees spread over the tenure.
              Always compare APR, not just the quoted rate.
            </span>
          </div>
        </div>

        {/* ═══ LENDER COMPARISON ═══ */}
        {lenderComparison && (
          <div className={`card lender-comparison`}>
            <div className="result-card__label" style={{ marginBottom: 'var(--space-sm)' }}>
              Lender Offer Comparison
            </div>
            <div className={`lender-comparison__verdict lender-comparison__verdict--${
              lenderComparison.verdict === 'good_deal' ? 'good' :
              lenderComparison.verdict === 'fair' ? 'fair' : 'bad'
            }`}>
              {lenderComparison.verdict === 'good_deal' ? '✓ Good deal' :
               lenderComparison.verdict === 'fair' ? '~ Fair deal' : '✗ You\'re overpaying'}
            </div>
            <p className="result-card__reason">{lenderComparison.explanation}</p>
            {lenderComparison.savingsIfFair > 0 && (
              <div className="info-sentence">
                <span className="info-sentence__icon">💰</span>
                <span>
                  Potential savings by negotiating: <strong>{formatRupees(lenderComparison.savingsIfFair)}</strong>
                </span>
              </div>
            )}
          </div>
        )}

        {/* ═══ O4: EMI ═══ */}
        <div className="card result-card result-card--emi">
          <div className="result-card__header">
            <span className="result-card__label">EMI & Tenure</span>
            <ConfidenceBadge level={emiResult.confidenceLevel} />
          </div>

          <div className="result-card__value result-card__value--gold">
            {formatRupees(emiResult.emiCeiling)}/month ceiling
          </div>
          <p className="result-card__reason">{emiResult.emiCeilingReason}</p>

          {/* Tenure trade-off table */}
          <table className="tenure-table">
            <thead>
              <tr>
                <th>Tenure</th>
                <th>EMI</th>
                <th>Total Interest</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {emiResult.tenureOptions.map((opt: TenureOption) => (
                <tr
                  key={opt.tenureMonths}
                  className={opt.isRecommended ? 'tr--recommended' : ''}
                >
                  <td>
                    <strong>{opt.tenureMonths} mo</strong> ({Math.round(opt.tenureMonths / 12)} yr)
                  </td>
                  <td>
                    <span className="rupee">{formatRupees(opt.emi)}</span>
                  </td>
                  <td>
                    <span className="rupee">{formatRupees(opt.totalInterest)}</span>
                  </td>
                  <td>
                    {opt.isRecommended ? (
                      <span className="badge badge--green">Recommended</span>
                    ) : opt.withinSafeCeiling ? (
                      <span className="badge badge--gold">Affordable</span>
                    ) : (
                      <span className="badge badge--red">Stretched</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Stress test */}
          <div className="stress-test">
            <div className="stress-test__title">Stress Test</div>
            <div className="stress-test__body">{emiResult.stressTest.explanation}</div>
          </div>
        </div>

        {/* ═══ NAVIGATION ═══ */}
        <div className="results__actions">
          <div className="results__actions-text">
            <h3 className="results__actions-title">Carry this leverage into your branch meeting</h3>
            <p className="results__actions-desc">
              Generate a printable, single-page Negotiation Card summarizing your fair rate, safe carry limit, and key questions to ask before signing.
            </p>
          </div>
          <div className="results__actions-buttons">
            <button
              className="btn btn--primary btn--lg"
              id="view-negotiation-card"
              onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'negotiation_card' })}
            >
              Open Negotiation Card →
            </button>
            <button
              className="btn btn--ghost"
              onClick={() => dispatch({ type: 'RESET' })}
            >
              Restart Assessment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Confidence badge component.
 */
function ConfidenceBadge({ level }: { level: 'high' | 'medium' | 'low' }) {
  const config = {
    high: { color: 'green', label: 'Good confidence', dots: 3 },
    medium: { color: 'amber', label: 'Moderate', dots: 2 },
    low: { color: 'red', label: 'Wide estimate', dots: 1 },
  };

  const c = config[level];

  return (
    <div className="confidence">
      <div className="confidence__dots">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className={`confidence__dot ${i <= c.dots ? 'confidence__dot--filled' : ''}`}
          />
        ))}
      </div>
      <span className={`badge badge--${c.color}`}>{c.label}</span>
    </div>
  );
}
