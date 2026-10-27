import { useRef, useState } from 'react';
import { downloadJson, exportAll, importAll, parseExport } from '../lib/data';
import { type View, useApp } from '../store';

const TABS: { id: View; label: string }[] = [
  { id: 'bank', label: 'Bank' },
  { id: 'rounds', label: 'Rounds' },
  { id: 'flow', label: 'Flow' },
];

export function Header() {
  const { view, setView, theme, toggleTheme, roundId } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  const flash = (m: string) => {
    setMessage(m);
    setTimeout(() => setMessage(null), 4000);
  };

  const onExport = async () => {
    const file = await exportAll();
    downloadJson(file, `rebuttal-flow-${new Date().toISOString().slice(0, 10)}.json`);
  };

  const onImport = async (f: File) => {
    try {
      const { counts } = await importAll(parseExport(await f.text()));
      flash(`Imported ${counts.responses} responses, ${counts.args} arguments, ${counts.rounds} rounds.`);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Import failed.');
    }
  };

  return (
    <header className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
      <span className="mr-2 font-bold tracking-tight text-sky-600 dark:text-sky-400">Rebuttal Flow</span>
      <nav className="flex gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            disabled={t.id === 'flow' && !roundId}
            onClick={() => setView(t.id)}
            className={`rounded-md px-3 py-1 text-sm font-medium disabled:opacity-40 ${
              view === t.id
                ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-2">
        {message && <span className="text-xs text-slate-500 dark:text-slate-400">{message}</span>}
        <button className="btn" onClick={onExport} title="Download everything as JSON">
          Export
        </button>
        <button className="btn" onClick={() => fileRef.current?.click()} title="Merge a JSON export">
          Import
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImport(f);
            e.target.value = '';
          }}
        />
        <button className="btn" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
      </div>
    </header>
  );
}
