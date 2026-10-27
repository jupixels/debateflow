import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { db } from '../db';
import {
  createArgument,
  createResolution,
  deleteArgument,
  deleteResolution,
  deleteResponse,
} from '../lib/repo';
import { useApp } from '../store';
import { type BankResponse, KIND_LABELS, KIND_NAMES, RESPONSE_KINDS, type ResponseKind, type Side } from '../types';
import { ResponseEditor } from './ResponseEditor';
import { KindBadge } from './KindBadge';

export function BankView() {
  const { resolutionId, argumentId, selectResolution, selectArgument } = useApp();
  const resolutions = useLiveQuery(() => db.resolutions.orderBy('createdAt').toArray(), []);
  const args = useLiveQuery(
    () => (resolutionId ? db.args.where('resolutionId').equals(resolutionId).sortBy('createdAt') : []),
    [resolutionId],
  );
  const responses = useLiveQuery(
    () => (argumentId ? db.responses.where('argumentId').equals(argumentId).sortBy('createdAt') : []),
    [argumentId],
  );
  const counts = useLiveQuery(async () => {
    if (!args?.length) return new Map<string, number>();
    const all = await db.responses.where('argumentId').anyOf(args.map((a) => a.id)).toArray();
    const m = new Map<string, number>();
    for (const r of all) m.set(r.argumentId, (m.get(r.argumentId) ?? 0) + 1);
    return m;
  }, [args]);

  // Default to the first resolution so the screen is never empty when data exists.
  useEffect(() => {
    if (resolutions && resolutions.length && !resolutions.some((r) => r.id === resolutionId)) {
      selectResolution(resolutions[0].id);
    }
  }, [resolutions, resolutionId, selectResolution]);

  const [newRes, setNewRes] = useState('');
  const [newArg, setNewArg] = useState<Record<Side, string>>({ PRO: '', CON: '' });
  const [kindFilter, setKindFilter] = useState<ResponseKind | 'ALL'>('ALL');
  const [cardFilter, setCardFilter] = useState<'ALL' | 'CARD' | 'ANALYTIC'>('ALL');
  const [editing, setEditing] = useState<BankResponse | 'new' | null>(null);

  const argument = args?.find((a) => a.id === argumentId);
  const filtered = useMemo(
    () =>
      (responses ?? []).filter(
        (r) =>
          (kindFilter === 'ALL' || r.kind === kindFilter) &&
          (cardFilter === 'ALL' || (cardFilter === 'CARD') === r.isCard),
      ),
    [responses, kindFilter, cardFilter],
  );

  return (
    <div className="grid h-full gap-3 overflow-auto p-3 md:grid-cols-[14rem_18rem_1fr] md:overflow-hidden">
      {/* Resolutions */}
      <section className="panel flex min-h-0 flex-col p-3">
        <h2 className="label">Resolutions</h2>
        <ul className="min-h-0 flex-1 space-y-1 overflow-auto">
          {resolutions?.map((r) => (
            <li key={r.id} className="group flex items-center gap-1">
              <button
                onClick={() => selectResolution(r.id)}
                className={`flex-1 rounded px-2 py-1 text-left text-sm ${
                  r.id === resolutionId ? 'bg-sky-100 dark:bg-sky-900/50' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {r.title}
              </button>
              <button
                className="btn-danger rounded px-1 text-xs pointer-fine:invisible pointer-fine:group-hover:visible focus:visible"
                aria-label={`Delete ${r.title}`}
                onClick={() => confirm(`Delete "${r.title}" and all its arguments and responses?`) && deleteResolution(r.id)}
              >
                ✕
              </button>
            </li>
          ))}
          {resolutions?.length === 0 && (
            <li className="text-sm text-slate-500">Add the current topic to start your bank.</li>
          )}
        </ul>
        <form
          className="mt-2 flex gap-1"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!newRes.trim()) return;
            const r = await createResolution(newRes);
            setNewRes('');
            selectResolution(r.id);
          }}
        >
          <input className="input" placeholder="New resolution…" value={newRes} onChange={(e) => setNewRes(e.target.value)} />
          <button className="btn">Add</button>
        </form>
      </section>

      {/* Opponent arguments */}
      <section className="panel flex min-h-0 flex-col p-3">
        <h2 className="label">Opponent arguments</h2>
        {!resolutionId ? (
          <p className="text-sm text-slate-500">Pick a resolution.</p>
        ) : (
          <div className="min-h-0 flex-1 space-y-4 overflow-auto">
            {(['PRO', 'CON'] as Side[]).map((side) => (
              <div key={side}>
                <h3 className="mb-1 text-xs font-bold text-slate-500">{side} arguments</h3>
                <ul className="space-y-1">
                  {args
                    ?.filter((a) => a.side === side)
                    .map((a) => (
                      <li key={a.id} className="group flex items-center gap-1">
                        <button
                          onClick={() => selectArgument(a.id)}
                          className={`flex flex-1 justify-between gap-2 rounded px-2 py-1 text-left text-sm ${
                            a.id === argumentId
                              ? 'bg-sky-100 dark:bg-sky-900/50'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span>{a.title}</span>
                          <span className="text-xs text-slate-400">{counts?.get(a.id) ?? 0}</span>
                        </button>
                        <button
                          className="btn-danger rounded px-1 text-xs pointer-fine:invisible pointer-fine:group-hover:visible focus:visible"
                          aria-label={`Delete ${a.title}`}
                          onClick={() => confirm(`Delete "${a.title}" and its responses?`) && deleteArgument(a.id)}
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                </ul>
                <form
                  className="mt-1 flex gap-1"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newArg[side].trim()) return;
                    const a = await createArgument(resolutionId, side, newArg[side]);
                    setNewArg({ ...newArg, [side]: '' });
                    selectArgument(a.id);
                  }}
                >
                  <input
                    className="input"
                    placeholder={`New ${side.toLowerCase()} argument…`}
                    value={newArg[side]}
                    onChange={(e) => setNewArg({ ...newArg, [side]: e.target.value })}
                  />
                  <button className="btn">Add</button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Responses */}
      <section className="panel flex min-h-0 flex-col p-3">
        {!argument ? (
          <p className="text-sm text-slate-500">Pick an opponent argument to see and write your responses.</p>
        ) : (
          <>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold">
                Responses to <span className="text-sky-600 dark:text-sky-400">{argument.title}</span>
              </h2>
              <button className="btn btn-primary ml-auto" onClick={() => setEditing('new')}>
                + Response
              </button>
            </div>
            <div className="mb-2 flex flex-wrap gap-1">
              {(['ALL', ...RESPONSE_KINDS] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setKindFilter(k)}
                  title={k === 'ALL' ? 'All' : KIND_NAMES[k]}
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    kindFilter === k ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800'
                  }`}
                >
                  {k === 'ALL' ? 'All' : KIND_LABELS[k]}
                </button>
              ))}
              <select
                className="input ml-auto w-auto py-0 text-xs"
                value={cardFilter}
                onChange={(e) => setCardFilter(e.target.value as typeof cardFilter)}
                aria-label="Card or analytic"
              >
                <option value="ALL">Cards + analytics</option>
                <option value="CARD">Cards only</option>
                <option value="ANALYTIC">Analytics only</option>
              </select>
            </div>
            {editing && (
              <ResponseEditor
                argumentId={argument.id}
                initial={editing === 'new' ? undefined : editing}
                onDone={() => setEditing(null)}
              />
            )}
            <ul className="min-h-0 flex-1 space-y-2 overflow-auto">
              {filtered.map((r) => (
                <li key={r.id} className="rounded-md border border-slate-200 p-2 dark:border-slate-800">
                  <div className="flex items-start gap-2">
                    <KindBadge kind={r.kind} />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{r.tag}</div>
                      {r.cite && <div className="text-xs text-slate-500 italic">{r.cite}</div>}
                    </div>
                    <span className="text-xs text-slate-400" title="Strength">
                      {'★'.repeat(r.strength)}
                    </span>
                    <span className="text-xs text-slate-400">{r.isCard ? 'card' : 'analytic'}</span>
                    <button className="btn px-1.5 py-0 text-xs" onClick={() => setEditing(r)}>
                      Edit
                    </button>
                    <button
                      className="btn btn-danger px-1.5 py-0 text-xs"
                      onClick={() => confirm('Delete this response?') && deleteResponse(r.id)}
                    >
                      Delete
                    </button>
                  </div>
                  {r.text && (
                    <p className="mt-1 line-clamp-3 text-sm whitespace-pre-line text-slate-600 dark:text-slate-300">
                      {r.text}
                    </p>
                  )}
                </li>
              ))}
              {filtered.length === 0 && !editing && (
                <li className="text-sm text-slate-500">No responses yet. Add one, or paste a card.</li>
              )}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
