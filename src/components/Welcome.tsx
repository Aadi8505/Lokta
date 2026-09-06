import { useBorrower } from '../context/BorrowerContext';

export function Welcome() {
  const { dispatch } = useBorrower();

  return (
    <div className="welcome">
      <h1 className="welcome__logo">Lokta</h1>
      <p className="welcome__tagline">
        Know your numbers before you walk into a lender.
        No login. No data stored. Just answers.
      </p>

      <div className="welcome__features">
        <div className="welcome__feature">
          <div className="welcome__feature-icon">🎯</div>
          <span>Should I borrow at all?</span>
        </div>
        <div className="welcome__feature">
          <div className="welcome__feature-icon">📊</div>
          <span>How much can I really borrow?</span>
        </div>
        <div className="welcome__feature">
          <div className="welcome__feature-icon">💰</div>
          <span>What's a fair interest rate for me?</span>
        </div>
        <div className="welcome__feature">
          <div className="welcome__feature-icon">📋</div>
          <span>What EMI should I agree to?</span>
        </div>
      </div>

      <button
        className="btn btn--primary btn--lg"
        id="start-assessment"
        onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'must_questions' })}
      >
        Start my assessment
      </button>

      <p className="welcome__disclaimer">
        This is a self-assessment tool. It does not access your credit bureau,
        store any personal information, or make lending decisions. All calculations
        run entirely in your browser.
      </p>
    </div>
  );
}
