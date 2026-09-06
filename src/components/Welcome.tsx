import { useBorrower } from '../context/BorrowerContext';

export function Welcome() {
  const { dispatch } = useBorrower();

  return (
    <div className="welcome">
      <div className="welcome__hero">
        <div className="welcome__badge">INDEPENDENT BORROWER COPILOT</div>
        <h1 className="welcome__logo">Lokta</h1>
        <p className="welcome__tagline">
          Know your financial limits and fair market rates before you talk to a lender.
          A pure client-side rules engine that arms Indian borrowers with real leverage.
        </p>

        <div className="welcome__cta-row">
          <button
            className="btn btn--primary btn--lg"
            id="start-assessment"
            onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'must_questions' })}
          >
            Start My Assessment →
          </button>
        </div>
      </div>

      {/* 4 Pillars Grid */}
      <div className="welcome__features-grid">
        <div className="welcome__feature-card">
          <div className="welcome__feature-icon">🎯</div>
          <div className="welcome__feature-title">Should I borrow?</div>
          <p className="welcome__feature-desc">
            Rules-driven verdict (Borrow / Borrow Less / Don't Borrow) analyzing your debt-to-income and cash-flow health.
          </p>
        </div>

        <div className="welcome__feature-card">
          <div className="welcome__feature-icon">📊</div>
          <div className="welcome__feature-title">How much can I carry?</div>
          <p className="welcome__feature-desc">
            Contrasts what aggressive lenders might push vs the conservative amount that protects your savings.
          </p>
        </div>

        <div className="welcome__feature-card">
          <div className="welcome__feature-icon">💰</div>
          <div className="welcome__feature-title">What is a fair rate?</div>
          <p className="welcome__feature-desc">
            Empirical benchmark rate bands and True All-In APR (IRR) accounting for upfront processing fees.
          </p>
        </div>

        <div className="welcome__feature-card">
          <div className="welcome__feature-icon">📋</div>
          <div className="welcome__feature-title">Safe EMI & Stress Test</div>
          <p className="welcome__feature-desc">
            Tenure trade-off matrix with interest burden analysis, simulated against rate hikes and income shocks.
          </p>
        </div>
      </div>

      <div className="welcome__trust-strip">
        <div className="welcome__trust-item">🔒 Zero server storage</div>
        <div className="welcome__trust-item">⚡ Instant client-side execution</div>
        <div className="welcome__trust-item">📜 Aligned with RBI FOIR regulations</div>
      </div>
    </div>
  );
}
