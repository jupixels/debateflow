import { useMemo, useState } from 'react';
import { searchResponses } from '../lib/search';
import type { Argument, BankResponse } from '../types';
import { KindBadge } from './KindBadge';

interface Props {
  responses: BankResponse[];
  args: Argument[];
  preferArgumentId?: string;
  onPick: (r: BankResponse) => void;
  onClose: () => void;
}

/** The "/" palette: fuzzy-search the bank and drop a response into the current cell. */
export function QuickInsert({ responses, args, preferArgumentId, onPick, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const hits = useMemo(
    () => searchResponses(responses, args, query, preferArgumentId),
    [responses, args, query, preferArgumentId],
  );
  const preferred = args.find((a) => a.id === preferArgumentId);

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/30 p-4 pt-[12vh]" onMouseDown={onClose}>
      <div
        className="panel w-full max-w-xl overflow-hidden shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Insert from bank"
      >
        <input
          autoFocus
          className="w-full border-b border-slate-200 bg-transparent px-3 py-2 outline-none dark:border-slate-800"
          placeholder={preferred ? `Responses to “${preferred.title}” — type to search the whole bank` : 'Search your bank…'}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              onClose();
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, hits.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              if (hits[active]) onPick(hits[active].response);
            }
          }}
        />
        <ul className="max-h-[50vh] overflow-auto">
          {hits.map((h, i) => (
            <li key={h.response.id}>
              <button
                onMouseEnter={() => setActive(i)}
                onClick={() => onPick(h.response)}
                className={`flex w-full items-start gap-2 px-3 py-2 text-left ${
                  i === active ? 'bg-sky-100 dark:bg-sky-900/50' : ''
                }`}
              >
                <KindBadge kind={h.response.kind} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{h.response.tag}</span>
                  <span className="block truncate text-xs text-slate-500">
                    {h.argument?.title}
                    {h.response.cite && ` · ${h.response.cite}`}
                  </span>
                </span>
                <span className="text-xs text-slate-400">{'★'.repeat(h.response.strength)}</span>
              </button>
            </li>
          ))}
          {hits.length === 0 && (
            <li className="px-3 py-3 text-sm text-slate-500">
              {query ? 'No matches.' : 'No saved responses for this argument yet. Type to search everything.'}
            </li>
          )}
        </ul>
        <div className="border-t border-slate-200 px-3 py-1.5 text-xs text-slate-500 dark:border-slate-800">
          <kbd>↑</kbd> <kbd>↓</kbd> choose · <kbd>Enter</kbd> insert · <kbd>Esc</kbd> close
        </div>
      </div>
    </div>
  );
}
