import { useBorrower, type AppScreen } from '../context/BorrowerContext';
import { runAssessment } from '../engine/assessment';

interface Props {
  title: string;
  subtitle: string;
  primaryAction: AppScreen;
  primaryLabel: string;
  secondaryAction: AppScreen;
  secondaryLabel: string;
}

export function SectionTransition({
  title, subtitle, primaryAction, primaryLabel,
  secondaryAction, secondaryLabel,
}: Props) {
  const { state, dispatch } = useBorrower();

  const handleNavigate = (screen: AppScreen) => {
    // Always compute assessment before going to results or additional
    const assessment = runAssessment(state.answers);
    dispatch({ type: 'SET_ASSESSMENT', assessment });
    dispatch({ type: 'SET_SCREEN', screen });
  };

  return (
    <div className="section-transition">
      <h2 className="section-transition__title">{title}</h2>
      <p className="section-transition__subtitle">{subtitle}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: 320 }}>
        <button
          className="btn btn--primary btn--lg btn--full"
          onClick={() => handleNavigate(primaryAction)}
        >
          {primaryLabel}
        </button>
        <button
          className="btn btn--secondary btn--full"
          onClick={() => handleNavigate(secondaryAction)}
        >
          {secondaryLabel}
        </button>
      </div>
    </div>
  );
}
