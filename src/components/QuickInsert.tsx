import { Search, Star } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { searchResponses } from '../lib/search';
import type { Argument, BankResponse, CxEntry } from '../types';
import { KindBadge } from './KindBadge';
import { Modal } from './ui';

interface Props {
  responses: BankResponse[];
  args: Argument[];
  concessions: CxEntry[];
  preferArgumentId?: string;
  onPick: (r: BankResponse) => void;
  onPickConcession: (e: CxEntry) => void;
  onClose: () => void;
}

type Item = { type: 'cx'; entry: CxEntry } | { type: 'bank'; response: BankResponse; argument?: Argument };

/** The "/" palette: fuzzy-search the bank (and crossfire concessions) and drop one into the current cell. */
export function QuickInsert({ responses, args, concessions, preferArgumentId, onPick, onPickConcession, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const preferred = args.find((a) => a.id === preferArgumentId);

  const items: Item[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const cx = concessions
      .filter((e) => !q || `${e.question} ${e.answer}`.toLowerCase().includes(q))
      .slice(0, 4)
      .map((entry) => ({ type: 'cx' as const, entry }));
    const bank = searchResponses(responses, args, query, preferArgumentId).map((h) => ({
      type: 'bank' as const,
      response: h.response,
      argument: h.argument,
    }));
    return [...cx, ...bank];
  }, [responses, args, concessions, query, preferArgumentId]);

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const choose = (it: Item | undefined) => {
    if (!it) return;
    if (it.type === 'cx') onPickConcession(it.entry);
    else onPick(it.response);
  };

  const firstBank = items.findIndex((i) => i.type === 'bank');

  return (
    <Modal label="Insert from bank" onClose={onClose}>
      <div className="flex items-center gap-2.5 border-b border-line px-4">
        <Search size={16} className="text-faint" />
        <input
          autoFocus
          className="h-12 flex-1 bg-transparent text-[0.95rem] outline-none placeholder:text-faint"
          placeholder={preferred ? `${preferred.caseId ? 'Frontlines for' : 'Responses to'} “${preferred.title}”… type to search everything` : 'Search your bank…'}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, items.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              choose(items[active]);
            }
          }}
        />
      </div>
      <ul ref={listRef} className="max-h-[52vh] overflow-auto p-1.5">
        {items.map((it, i) => (
          <li key={it.type === 'cx' ? it.entry.id : it.response.id}>
            {i === 0 && it.type === 'cx' && <div className="eyebrow px-2.5 pt-1.5 pb-1">Crossfire concessions</div>}
            {i === firstBank && (
              <div className="eyebrow px-2.5 pt-1.5 pb-1">
                {!query && preferred ? `${preferred.caseId ? 'Frontlines for' : 'Responses to'} ${preferred.title}` : 'From your bank'}
              </div>
            )}
            <button
              data-active={i === active}
              onMouseMove={() => setActive(i)}
              onClick={() => choose(it)}
              className={`flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left ${i === active ? 'bg-accent-soft' : ''}`}
            >
              {it.type === 'cx' ? (
                <>
                  <Star size={14} className="mt-0.5 shrink-0 fill-warn text-warn" />
                  <span className="min-w-0 flex-1 text-sm">
                    {it.entry.answer || it.entry.question}
                    <span className="block truncate text-xs text-muted">
                      {it.entry.segment} · Q: {it.entry.question}
                    </span>
                  </span>
                </>
              ) : (
                <>
                  <KindBadge kind={it.response.kind} className="mt-0.5" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{it.response.tag}</span>
                    <span className="block truncate text-xs text-muted">
                      {it.argument?.title}
                      {it.response.cite && ` · ${it.response.cite}`}
                    </span>
                  </span>
                  <span className="text-xs text-warn">{'★'.repeat(it.response.strength)}</span>
                </>
              )}
            </button>
          </li>
        ))}
        {items.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-muted">
            {query ? 'No matches.' : 'No saved responses for this argument yet. Type to search your whole bank.'}
          </li>
        )}
      </ul>
      <div className="flex gap-4 border-t border-line px-4 py-2 text-xs text-faint">
        <span>
          <kbd>↑</kbd> <kbd>↓</kbd> choose
        </span>
        <span>
          <kbd>Enter</kbd> insert
        </span>
        <span>
          <kbd>Esc</kbd> close
        </span>
      </div>
    </Modal>
  );
}
