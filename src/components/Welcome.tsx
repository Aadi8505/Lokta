import { useBorrower } from '../context/BorrowerContext';
import type { BorrowerAnswers } from '../engine/types';

// Preset personas from verified run-throughs
const PRESETS: { id: string; name: string; tag: string; description: string; answers: BorrowerAnswers }[] = [
  {
    id: 'priya',
    name: 'Priya',
    tag: 'Salaried · ₹1.5L/mo',
    description: 'Tech worker looking for ₹8L home renovation loan with 760 CIBIL.',
    answers: {
      loanPurpose: 'home_renovation',
      amountWanted: 800000,
      incomeType: 'salaried',
      monthlyIncome: 150000,
      existingEmis: 15000,
      monthlyExpenses: 45000,
      creditScore: 760,
      emergencySavingsMonths: 6,
      yearsInJob: 4,
    },
  },
  {
    id: 'ravi',
    name: 'Ravi',
    tag: 'Kirana Owner · ₹85k ITR',
    description: 'Evaluating ₹15L store expansion: 18% NBFC offer vs secured LAP at 11%.',
    answers: {
      loanPurpose: 'business_expansion',
      amountWanted: 1500000,
      incomeType: 'self_employed',
      monthlyIncome: 120000,
      itrFiled: true,
      itrIncome: 1020000,
      existingEmis: 32000,
      monthlyExpenses: 40000,
      creditScore: 710,
      collateralAvailable: true,
      collateralValue: 3500000,
      existingLenderOffer: true,
      offeredRate: 18.0,
      offeredProcessingFee: 2.0,
    },
  },
  {
    id: 'anita',
    name: 'Anita',
    tag: 'Gig Delivery · ₹28k/mo',
    description: 'Facing 41% FOIR and 36% app loans; needs emergency debt triage.',
    answers: {
      loanPurpose: 'medical',
      amountWanted: 30000,
      incomeType: 'informal',
      monthlyIncome: 28000,
      existingEmis: 11500,
      monthlyExpenses: 15000,
      creditScore: 'unknown',
      emergencySavingsMonths: 0,
      existingLenderOffer: true,
      offeredRate: 30.0,
      existingDebtRate: 36.0,
      existingDebtOutstanding: 25000,
    },
  },
];

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

      {/* Quick Run-Through Demo Presets */}
      <div className="welcome__presets">
        <div className="welcome__presets-header">
          <h2 className="welcome__presets-title">Or test with verified persona scenarios</h2>
          <p className="welcome__presets-sub">
            Pre-configured profiles demonstrating different income tiers, credit profiles, and borrowing outcomes.
          </p>
        </div>

        <div className="welcome__presets-grid">
          {PRESETS.map(preset => (
            <div
              key={preset.id}
              className="welcome__preset-card"
              role="button"
              tabIndex={0}
              id={`preset-${preset.id}`}
              onClick={() => dispatch({ type: 'LOAD_PROFILE', answers: preset.answers })}
            >
              <div className="welcome__preset-top">
                <span className="welcome__preset-name">{preset.name}</span>
                <span className="welcome__preset-tag">{preset.tag}</span>
              </div>
              <p className="welcome__preset-desc">{preset.description}</p>
              <span className="welcome__preset-link">Load scenario assessment →</span>
            </div>
          ))}
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
