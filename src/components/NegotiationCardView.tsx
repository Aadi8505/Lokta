/**
 * NegotiationCardView.tsx — The one-screen card borrowers can show lenders.
 * Printable via Ctrl+P / Save as PDF.
 */

import { useBorrower } from '../context/BorrowerContext';
import { formatRupees, formatRupeeRange, formatPctRange } from '../helpers';

export function NegotiationCardView() {
  const { state, dispatch } = useBorrower();
  const card = state.assessment?.negotiationCard;

  if (!card) {
    return (
      <div className="section-transition">
        <h2 className="section-transition__title">No assessment found</h2>
        <button
          className="btn btn--primary"
          onClick={() => dispatch({ type: 'RESET' })}
        >
          Start over
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--space-xl) var(--space-lg)' }}>
      <div className="neg-card" id="negotiation-card">
        <div className="neg-card__header">
          <div>
            <div className="neg-card__title">YOUR NEGOTIATION CARD</div>
            <div className="neg-card__date">
              Generated {card.generatedDate} · For discussion only
            </div>
          </div>
        </div>

        {/* Profile */}
        <div className="neg-card__profile">
          <span className="neg-card__profile-item">{card.profile.incomeType}</span>
          {card.profile.age && (
            <span className="neg-card__profile-item">Age {card.profile.age}</span>
          )}
          <span className="neg-card__profile-item">{card.profile.scoreBand}</span>
        </div>

        {/* Verdict */}
        <div className="neg-card__section">
          <div className="neg-card__section-title">
            <span className="neg-card__section-icon">🎯</span>
            Assessment
          </div>
          <div className="neg-card__section-value">{card.verdict.decision}</div>
          <div className="neg-card__section-reason">{card.verdict.reason}</div>
        </div>

        {/* Fair Rate */}
        <div className="neg-card__section">
          <div className="neg-card__section-title">
            <span className="neg-card__section-icon">💰</span>
            Fair Rate for Your Profile
          </div>
          <div className="neg-card__section-value">
            {formatPctRange(card.fairRate[0], card.fairRate[1])}
          </div>
          <div className="neg-card__section-reason">
            All-in cost (APR): {formatPctRange(card.fairAPR[0], card.fairAPR[1])}
          </div>
          <div className="neg-card__section-reason" style={{ marginTop: '4px' }}>
            {card.rateReason}
          </div>
        </div>

        {/* Amounts */}
        <div className="neg-card__section">
          <div className="neg-card__section-title">
            <span className="neg-card__section-icon">📊</span>
            Borrowing Capacity
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Safe to carry
              </div>
              <div className="neg-card__section-value" style={{ color: 'var(--accent-green)', fontSize: 'var(--font-size-lg)' }}>
                {formatRupeeRange(card.safeAmount[0], card.safeAmount[1], true)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Lender may offer
              </div>
              <div className="neg-card__section-value" style={{ fontSize: 'var(--font-size-lg)' }}>
                {formatRupeeRange(card.lenderAmount[0], card.lenderAmount[1], true)}
              </div>
            </div>
          </div>
          <div className="neg-card__section-reason" style={{ marginTop: '8px' }}>
            {card.amountAdvice}
          </div>
        </div>

        {/* EMI Ceiling */}
        <div className="neg-card__section">
          <div className="neg-card__section-title">
            <span className="neg-card__section-icon">📋</span>
            EMI Ceiling
          </div>
          <div className="neg-card__section-value">
            {formatRupees(card.emiCeiling)}/month
          </div>
          <div className="neg-card__section-reason">{card.stressSummary}</div>
        </div>

        {/* Lender offer comparison */}
        {card.comparisonNote && (
          <div className="neg-card__section">
            <div className="neg-card__section-title">
              <span className="neg-card__section-icon">🔍</span>
              Your Offer vs Fair Range
            </div>
            <div className="neg-card__section-reason">{card.comparisonNote}</div>
          </div>
        )}

        {/* Questions to ask */}
        <div className="neg-card__questions">
          <div className="neg-card__questions-title">
            Ask the lender these questions:
          </div>
          {card.lenderQuestions.map((q, i) => (
            <div key={i} className="neg-card__question-item">{q}</div>
          ))}
        </div>

        <div className="neg-card__footer">
          <div className="neg-card__disclaimer">
            Self-assessment only. Not a credit offer. Based on user-provided information.
            Generated by Lokta Borrower Copilot.
          </div>
          <div className="no-print">
            <button
              className="btn btn--primary"
              onClick={() => window.print()}
            >
              Print / Save PDF
            </button>
          </div>
        </div>
      </div>

      {/* Back navigation */}
      <div className="no-print" style={{
        display: 'flex', gap: '12px', justifyContent: 'center',
        padding: 'var(--space-xl) 0 var(--space-2xl)', maxWidth: 640, margin: '0 auto'
      }}>
        <button
          className="btn btn--secondary"
          onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'results' })}
        >
          ← Back to results
        </button>
        <button
          className="btn btn--ghost"
          onClick={() => dispatch({ type: 'RESET' })}
        >
          Start over
        </button>
      </div>
    </div>
  );
}
