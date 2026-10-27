import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db } from '../db';
import { createRound, createResolution, deleteRound } from '../lib/repo';
import { useApp } from '../store';
import type { JudgeType, Side } from '../types';
import { useOpenRound } from '../hooks/useOpenRound';

export function RoundsView() {
  const resolutionId = useApp((s) => s.resolutionId);
  const resolutions = useLiveQuery(() => db.resolutions.orderBy('createdAt').toArray(), []);
  const rounds = useLiveQuery(() => db.rounds.orderBy('createdAt').reverse().toArray(), []);
  const open = useOpenRound();

  const [form, setForm] = useState({
    resolutionId: '',
    newResolution: '',
    tournament: '',
    roundName: '',
    ourSide: 'PRO' as Side,
    speakingOrder: 2 as 1 | 2,
    opponents: '',
    judge: '',
    judgeType: 'FLOW' as JudgeType,
    prepMinutes: 3,
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const chosenResolution = form.resolutionId || resolutionId || resolutions?.[0]?.id || '';

  const start = async (e: React.FormEvent) => {
    e.preventDefault();
    let resId = chosenResolution;
    if (resId === '__new' || !resId) {
      if (!form.newResolution.trim()) return;
      resId = (await createResolution(form.newResolution)).id;
    }
    const round = await createRound({
      resolutionId: resId,
      tournament: form.tournament.trim(),
      roundName: form.roundName.trim(),
      ourSide: form.ourSide,
      speakingOrder: form.speakingOrder,
      opponents: form.opponents.trim(),
      judge: form.judge.trim(),
      judgeType: form.judgeType,
      prepSeconds: Math.round(form.prepMinutes * 60),
    });
    open(round);
  };

  const resTitle = (id: string) => resolutions?.find((r) => r.id === id)?.title ?? '—';

  return (
    <div className="grid h-full gap-3 overflow-auto p-3 lg:grid-cols-[26rem_1fr]">
      <form onSubmit={start} className="panel space-y-3 self-start p-4">
        <h2 className="text-base font-semibold">New round</h2>
        <div>
          <label className="label" htmlFor="res">
            Resolution
          </label>
          <select id="res" className="input" value={chosenResolution} onChange={(e) => set('resolutionId', e.target.value)}>
            {resolutions?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
            <option value="__new">+ New resolution…</option>
          </select>
          {(chosenResolution === '__new' || !chosenResolution) && (
            <input
              className="input mt-1"
              placeholder="Resolution text"
              value={form.newResolution}
              onChange={(e) => set('newResolution', e.target.value)}
              required
            />
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label" htmlFor="tournament">
              Tournament
            </label>
            <input id="tournament" className="input" value={form.tournament} onChange={(e) => set('tournament', e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="roundName">
              Round
            </label>
            <input
              id="roundName"
              className="input"
              placeholder="R3, Octas…"
              value={form.roundName}
              onChange={(e) => set('roundName', e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <fieldset>
            <legend className="label">Our side</legend>
            <Segmented value={form.ourSide} options={['PRO', 'CON']} onChange={(v) => set('ourSide', v)} />
          </fieldset>
          <fieldset>
            <legend className="label">We speak</legend>
            <Segmented
              value={form.speakingOrder}
              options={[1, 2]}
              labels={{ 1: 'First', 2: 'Second' }}
              onChange={(v) => set('speakingOrder', v)}
            />
          </fieldset>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label" htmlFor="opponents">
              Opponents
            </label>
            <input id="opponents" className="input" value={form.opponents} onChange={(e) => set('opponents', e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="judge">
              Judge
            </label>
            <input id="judge" className="input" value={form.judge} onChange={(e) => set('judge', e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <fieldset>
            <legend className="label">Judge type</legend>
            <Segmented
              value={form.judgeType}
              options={['LAY', 'FLOW', 'TECH']}
              labels={{ LAY: 'Lay', FLOW: 'Flow', TECH: 'Tech' }}
              onChange={(v) => set('judgeType', v)}
            />
          </fieldset>
          <div>
            <label className="label" htmlFor="prep">
              Prep (min/team)
            </label>
            <input
              id="prep"
              type="number"
              min={0}
              max={10}
              step={0.5}
              className="input"
              value={form.prepMinutes}
              onChange={(e) => set('prepMinutes', Number(e.target.value))}
            />
          </div>
        </div>
        <button className="btn btn-primary w-full justify-center py-2">Start flowing →</button>
      </form>

      <section className="panel self-start p-4">
        <h2 className="mb-2 text-base font-semibold">Rounds</h2>
        {rounds?.length === 0 && <p className="text-sm text-slate-500">No rounds yet.</p>}
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {rounds?.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-2 py-2">
              <div className="min-w-0 flex-1">
                <div className="font-medium">
                  {[r.tournament, r.roundName].filter(Boolean).join(' · ') || 'Untitled round'}
                  <span className="ml-2 text-xs text-slate-500">
                    {r.ourSide} · speaking {r.speakingOrder === 1 ? 'first' : 'second'}
                    {r.opponents && ` · vs ${r.opponents}`}
                  </span>
                </div>
                <div className="truncate text-xs text-slate-500">
                  {resTitle(r.resolutionId)} · {new Date(r.createdAt).toLocaleDateString()}
                </div>
              </div>
              <button className="btn" onClick={() => open(r)}>
                Open
              </button>
              <button
                className="btn btn-danger"
                onClick={() => confirm('Delete this round and its flow?') && deleteRound(r.id)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Segmented<T extends string | number>({
  value,
  options,
  labels,
  onChange,
}: {
  value: T;
  options: T[];
  labels?: Partial<Record<T, string>>;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex overflow-hidden rounded-md border border-slate-300 dark:border-slate-700">
      {options.map((o) => (
        <button
          type="button"
          key={String(o)}
          aria-pressed={o === value}
          onClick={() => onChange(o)}
          className={`flex-1 px-2 py-1 text-sm ${
            o === value ? 'bg-sky-600 text-white' : 'bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800'
          }`}
        >
          {labels?.[o] ?? String(o)}
        </button>
      ))}
    </div>
  );
}
