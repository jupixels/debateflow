import { useLiveQuery } from 'dexie-react-hooks';
import { BookOpen, Download, Keyboard, ListChecks, ScrollText, Settings, Swords } from 'lucide-react';
import { db } from '../db';
import { promptInstall, useInstall } from '../lib/install';
import { type View, useApp } from '../store';
import { Logo } from './ui';

const TABS: { id: View; label: string; icon: typeof BookOpen }[] = [
  { id: 'bank', label: 'Bank', icon: BookOpen },
  { id: 'case', label: 'Case', icon: ScrollText },
  { id: 'rounds', label: 'Rounds', icon: ListChecks },
  { id: 'flow', label: 'Flow', icon: Swords },
];

export function AppHeader({ onSettings, onShortcuts }: { onSettings: () => void; onShortcuts: () => void }) {
  const { view, setView, roundId, role } = useApp();
  const installPrompt = useInstall((s) => s.prompt);
  const round = useLiveQuery(() => (roundId ? db.rounds.get(roundId) : undefined), [roundId]);
  const roundLabel = round && ([round.roundName, round.opponents && `vs ${round.opponents}`].filter(Boolean).join(' ') || 'Round');

  return (
    <header className="relative z-30 flex h-13 shrink-0 items-center gap-3 border-b border-line bg-surface/85 px-3 backdrop-blur sm:px-4">
      <div className="flex items-center gap-2">
        <Logo size={26} />
        <span className="hidden font-semibold tracking-tight sm:inline">U Flow</span>
      </div>
      <nav className="seg ml-1 sm:ml-3" aria-label="Main">
        {TABS.filter((t) => t.id !== 'case' || role !== 'REBUTTAL').map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            aria-pressed={view === id}
            disabled={id === 'flow' && !roundId}
            onClick={() => setView(id)}
            className="disabled:opacity-40"
          >
            <span className="inline-flex items-center gap-1.5">
              <Icon size={15} />
              {label}
              {id === 'flow' && roundLabel && (
                <span className="hidden max-w-36 truncate rounded bg-accent-soft px-1.5 text-xs font-medium text-accent-text md:inline">
                  {roundLabel}
                </span>
              )}
            </span>
          </button>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-1">
        {installPrompt && (
          <button className="btn btn-primary btn-sm mr-1" onClick={promptInstall}>
            <Download size={14} /> <span className="hidden sm:inline">Install app</span>
          </button>
        )}
        <button className="btn btn-ghost btn-icon" onClick={onShortcuts} aria-label="Keyboard shortcuts" title="Keyboard shortcuts (?)">
          <Keyboard size={17} />
        </button>
        <button className="btn btn-ghost btn-icon" onClick={onSettings} aria-label="Settings" title="Settings">
          <Settings size={17} />
        </button>
      </div>
    </header>
  );
}
