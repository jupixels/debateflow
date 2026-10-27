import { useEffect } from 'react';
import { Header } from './components/Header';
import { BankView } from './components/BankView';
import { RoundsView } from './components/RoundsView';
import { FlowView } from './components/FlowView';
import { useApp } from './store';

export default function App() {
  const view = useApp((s) => s.view);
  const theme = useApp((s) => s.theme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <div className="flex h-full flex-col">
      <Header />
      <main className="min-h-0 flex-1">
        {view === 'bank' && <BankView />}
        {view === 'rounds' && <RoundsView />}
        {view === 'flow' && <FlowView />}
      </main>
    </div>
  );
}
