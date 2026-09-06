import { BorrowerProvider } from './context/BorrowerContext';
import { AppRouter } from './components/AppRouter';
import './index.css';

function App() {
  return (
    <BorrowerProvider>
      <AppRouter />
    </BorrowerProvider>
  );
}

export default App;
