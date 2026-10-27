import { useState } from 'react';
import { parseCard } from '../lib/cardParser';
import { createArgument } from '../lib/repo';
import type { Argument, ResponseKind, Side } from '../types';
import { ResponseEditor } from './ResponseEditor';

interface Props {
  resolutionId: string;
  args: Argument[];
  sheet: Side;
  text: string;
  kind?: ResponseKind;
  argumentId?: string;
  /** Suggested title for a new argument (the row's constructive cell). */
  suggestedTitle: string;
  onSaved: (argumentId: string) => void;
  onClose: () => void;
}

/** Ctrl+Enter in a cell: turn what you just flowed into a reusable bank response. */
export function SaveToBankDialog(p: Props) {
  const [argumentId, setArgumentId] = useState(p.argumentId ?? '');
  const [newTitle, setNewTitle] = useState(p.suggestedTitle);
  const parsed = parseCard(p.text);
  const sideArgs = p.args.filter((a) => a.side === p.sheet);

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-auto bg-black/30 p-4 pt-[8vh]" onMouseDown={p.onClose}>
      <div
        className="panel w-full max-w-2xl p-4 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === 'Escape' && p.onClose()}
        role="dialog"
        aria-label="Save to bank"
      >
        <h2 className="mb-3 text-base font-semibold">Save to bank</h2>
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <div className="min-w-48 flex-1">
            <label className="label" htmlFor="saveArg">
              Responds to
            </label>
            <select id="saveArg" className="input" value={argumentId} onChange={(e) => setArgumentId(e.target.value)}>
              <option value="">+ New argument…</option>
              {sideArgs.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          </div>
          {!argumentId && (
            <form
              className="flex flex-[2] gap-1"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newTitle.trim()) return;
                setArgumentId((await createArgument(p.resolutionId, p.sheet, newTitle)).id);
              }}
            >
              <input
                autoFocus
                className="input"
                placeholder={`${p.sheet} argument title`}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <button className="btn">Create</button>
            </form>
          )}
        </div>
        {argumentId && (
          <ResponseEditor
            key={argumentId}
            argumentId={argumentId}
            initial={{ ...parsed, kind: p.kind ?? 'OTHER', cite: parsed.cite, url: parsed.url }}
            onDone={(saved) => (saved ? p.onSaved(argumentId) : p.onClose())}
          />
        )}
      </div>
    </div>
  );
}
