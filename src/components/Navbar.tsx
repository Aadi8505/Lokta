import { useBorrower } from '../context/BorrowerContext';

export function Navbar() {
  const { state, dispatch } = useBorrower();
  const hasAssessment = Boolean(state.assessment);

  return (
    <header className="navbar no-print">
      <div className="navbar__inner">
        <div
          className="navbar__left"
          role="button"
          tabIndex={0}
          onClick={() => dispatch({ type: 'RESET' })}
        >
          <span className="navbar__logo">Lokta</span>
          <span className="navbar__badge">BORROWER COPILOT</span>
        </div>

        <div className="navbar__center">
          <span className="navbar__privacy-pill">
            <span className="navbar__pulse-dot"></span>
            Zero Bureau Hits · Client-Side Only · 100% Private
          </span>
        </div>

        <div className="navbar__right">
          {state.screen !== 'welcome' && (
            <nav className="navbar__nav-links">
              {hasAssessment && (
                <>
                  <button
                    className={`navbar__link ${state.screen === 'results' ? 'navbar__link--active' : ''}`}
                    onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'results' })}
                  >
                    Assessment
                  </button>
                  <button
                    className={`navbar__link ${state.screen === 'negotiation_card' ? 'navbar__link--active' : ''}`}
                    onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'negotiation_card' })}
                  >
                    Negotiation Card
                  </button>
                </>
              )}
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => dispatch({ type: 'RESET' })}
              >
                Restart
              </button>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
