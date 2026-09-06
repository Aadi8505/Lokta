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
    <div className="neg-card-wrapper">
      <div className="neg-card" id="negotiation-card">
        <div className="neg-card__header">
          <div>
            <div className="neg-card__badge">BRANCH READY DOSSIER</div>
            <div className="neg-card__title">BORROWER NEGOTIATION CARD</div>
            <div className="neg-card__date">
              Generated {card.generatedDate} · Independent Borrower Assessment
            </div>
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

        {/* Profile badges */}
        <div className="neg-card__profile">
          <span className="neg-card__profile-item">Employment: {card.profile.incomeType}</span>
          {card.profile.age && (
            <span className="neg-card__profile-item">Age: {card.profile.age}</span>
          )}
          <span className="neg-card__profile-item">Credit Score: {card.profile.scoreBand}</span>
        </div>

        {/* Two-column layout on desktop */}
        <div className="neg-card__grid">
          {/* Left Column: Core Numbers */}
          <div className="neg-card__col">
            {/* Verdict */}
            <div className="neg-card__section">
              <div className="neg-card__section-title">
                <span className="neg-card__section-icon">🎯</span>
                Assessment Verdict
              </div>
              <div className="neg-card__section-value">{card.verdict.decision}</div>
              <div className="neg-card__section-reason">{card.verdict.reason}</div>
            </div>

            {/* Amounts */}
            <div className="neg-card__section">
              <div className="neg-card__section-title">
                <span className="neg-card__section-icon">📊</span>
                Borrowing Capacity
              </div>
              <div className="amount-comparison" style={{ marginBottom: '8px' }}>
                <div className="amount-comparison__item">
                  <div className="amount-comparison__label">Safe to carry</div>
                  <div className="amount-comparison__value amount-comparison__value--safe">
                    {formatRupeeRange(card.safeAmount[0], card.safeAmount[1], true)}
                  </div>
                </div>
                <div className="amount-comparison__item">
                  <div className="amount-comparison__label">Lender may approve</div>
                  <div className="amount-comparison__value amount-comparison__value--lender">
                    {formatRupeeRange(card.lenderAmount[0], card.lenderAmount[1], true)}
                  </div>
                </div>
              </div>
              <div className="neg-card__section-reason">{card.amountAdvice}</div>
            </div>

            {/* Fair Rate */}
            <div className="neg-card__section">
              <div className="neg-card__section-title">
                <span className="neg-card__section-icon">💰</span>
                Fair Rate & All-In Cost
              </div>
              <div className="rate-display" style={{ marginBottom: '8px' }}>
                <div className="rate-display__item">
                  <div className="rate-display__label">Quoted Rate Band</div>
                  <div className="rate-display__value">
                    {formatPctRange(card.fairRate[0], card.fairRate[1])}
                  </div>
                </div>
                <div className="rate-display__item">
                  <div className="rate-display__label">True All-in APR</div>
                  <div className="rate-display__value" style={{ color: 'var(--accent-gold)' }}>
                    {formatPctRange(card.fairAPR[0], card.fairAPR[1])}
                  </div>
                </div>
              </div>
              <div className="neg-card__section-reason">{card.rateReason}</div>
            </div>

            {/* EMI Ceiling */}
            <div className="neg-card__section">
              <div className="neg-card__section-title">
                <span className="neg-card__section-icon">📋</span>
                Safe EMI Ceiling
              </div>
              <div className="neg-card__section-value" style={{ color: 'var(--accent-gold)' }}>
                {formatRupees(card.emiCeiling)} / month
              </div>
              <div className="neg-card__section-reason">{card.stressSummary}</div>
            </div>
          </div>

          {/* Right Column: Negotiation Leverage & Branch Strategy */}
          <div className="neg-card__col">
            {/* Offer comparison if present */}
            {card.comparisonNote && (
              <div className="neg-card__section neg-card__section--highlight">
                <div className="neg-card__section-title">
                  <span className="neg-card__section-icon">🔍</span>
                  Lender Offer vs Fair Range
                </div>
                <div className="neg-card__section-reason">{card.comparisonNote}</div>
              </div>
            )}

            {/* Questions to Ask */}
            <div className="neg-card__questions">
              <div className="neg-card__questions-title">
                Critical Questions to Ask Before Signing:
              </div>
              {card.lenderQuestions.map((q, i) => (
                <div key={i} className="neg-card__question-item">
                  <span className="neg-card__question-num">{i + 1}</span>
                  <span>{q}</span>
                </div>
              ))}
            </div>

            {/* Negotiation rules of thumb */}
            <div className="neg-card__section" style={{ marginTop: 'var(--space-md)' }}>
              <div className="neg-card__section-title">
                <span className="neg-card__section-icon">🛡</span>
                Branch Negotiation Rules:
              </div>
              <ul className="neg-card__bullet-list">
                <li>Never accept loan insurance bundled into the principal without itemized written quotes.</li>
                <li>Compare the loan against your True APR (IRR), not the nominal rate quoted by the sales agent.</li>
                <li>Confirm in writing that there are zero foreclosure/prepayment penalties.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="neg-card__footer">
          <div className="neg-card__disclaimer">
            Self-assessment dossier prepared by Lokta Borrower Copilot. Independent borrower assessment based on RBI guidelines and industry FOIR benchmarks. Not an official sanction letter.
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
