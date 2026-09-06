import { BorrowerProvider } from './context/BorrowerContext';
import { AppRouter } from './components/AppRouter';
import { Navbar } from './components/Navbar';
import './index.css';

function App() {
  return (
    <BorrowerProvider>
      <div className="app-shell">
        <Navbar />
        <main className="app-main">
          <AppRouter />
        </main>
      </div>
    </BorrowerProvider>
  );
}

export default App;
