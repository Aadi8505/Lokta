import { useBorrower } from '../context/BorrowerContext';
import { Welcome } from './Welcome';
import { QuestionFlow } from './QuestionFlow';
import { SectionTransition } from './SectionTransition';
import { ResultsDashboard } from './ResultsDashboard';
import { NegotiationCardView } from './NegotiationCardView';

export function AppRouter() {
  const { state } = useBorrower();

  switch (state.screen) {
    case 'welcome':
      return <Welcome />;
    case 'must_questions':
      return <QuestionFlow tier="must" />;
    case 'must_results_preview':
      return (
        <SectionTransition
          title="Your preliminary results are ready"
          subtitle="Based on your core answers, we have a first assessment. Answer a few more questions to narrow the ranges and improve accuracy."
          primaryAction="additional_questions"
          primaryLabel="Narrow my ranges →"
          secondaryAction="results"
          secondaryLabel="Show results now"
        />
      );
    case 'additional_questions':
      return <QuestionFlow tier="additional" />;
    case 'results':
      return <ResultsDashboard />;
    case 'negotiation_card':
      return <NegotiationCardView />;
    default:
      return <Welcome />;
  }
}
