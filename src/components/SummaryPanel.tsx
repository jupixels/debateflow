import { useLiveQuery } from 'dexie-react-hooks';
import { AlertTriangle, BookOpenText, Check, ClipboardCopy, ListChecks, ShieldAlert, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { db } from '../db';
import { useAutosize } from '../hooks/useAutosize';
import { clock, secondsFor } from '../lib/caseTime';
import { setRowPlan, setWeighing } from '../lib/repo';
import { type SummaryItem, analyzeFlow, buildOutline, collapseAdvice, outlineText, outlineWords } from '../lib/summary';
import { toast, useApp } from '../store';
import type { Round } from '../types';
import { ReadingMode } from './ReadingMode';

const WEIGHING_WORDS = ['Magnitude', 'Probability', 'Scope', 'Timeframe', 'Reversibility', 'Clarity of link', 'Prerequisite'];

const STATUS: Record<SummaryItem['status'], { text: string; tone: string }> = {
  clean: { text: 'Unanswered by them', tone: 'bg-ok/15 text-ok' },
  frontlined: { text: 'Frontlined', tone: 'bg-accent-soft text-accent-text' },
  'needs-frontline': { text: 'Needs a frontline', tone: 'bg-danger/15 text-danger' },
  answered: { text: 'We answered', tone: 'bg-accent-soft text-accent-text' },
  unanswered: { text: 'We haven’t answered', tone: 'bg-danger/15 text-danger' },
};

/** Plan summary or final focus from the flow: pick what to extend, check coverage, add weighing. */
export function SummaryPanel({ round, timerSegment, onClose }: { round: Round; timerSegment: string; onClose: () => void }) {
  const { wpm, role } = useApp();
  const [speech, setSpeech] = useState<'summary' | 'ff'>(() =>
    /FF$/.test(timerSegment) ? 'ff' : /S$/.test(timerSegment) ? 'summary' : role === 'REBUTTAL' ? 'ff' : 'summary',
  );
  const rows = useLiveQuery(() => db.rows.where('roundId').equals(round.id).toArray(), [round.id]);
  const cells = useLiveQuery(() => db.cells.where('roundId').equals(round.id).toArray(), [round.id]);
  const args = useLiveQuery(() => db.args.where('resolutionId').equals(round.resolutionId).toArray(), [round.resolutionId]);
  const [weighing, setW] = useState(round.weighing ?? '');
  const [reading, setReading] = useState(false);
  const wRef = useRef<HTMLTextAreaElement>(null);
  useAutosize(wRef, [weighing]);

  // Save weighing notes shortly after typing stops.
  useEffect(() => {
    if (weighing === (round.weighing ?? '')) return;
    const t = setTimeout(() => setWeighing(round.id, weighing), 400);
    return () => clearTimeout(t);
  }, [weighing, round.id, round.weighing]);

  const { ours, theirs } = useMemo(
    () => (rows && cells && args ? analyzeFlow(round, rows, cells, args) : { ours: [], theirs: [] }),
    [round, rows, cells, args],
  );
  const outline = useMemo(() => buildOutline(ours, theirs, weighing), [ours, theirs, weighing]);
  const seconds = secondsFor(outlineWords(outline), wpm);
  const target = speech === 'ff' ? 120 : 180;
  const advice = collapseAdvice(ours.filter((o) => o.plan === 'go').length, round.judgeType, speech);
  const needsWork = [...ours, ...theirs].filter((i) => i.plan === 'go' && (i.status === 'needs-frontline' || i.status === 'unanswered'));

  return (
    <aside className="animate-slide flex h-full w-full flex-col border-l border-line bg-surface sm:w-[25rem]" aria-label="Summary builder">
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <ListChecks size={16} className="text-accent-text" />
        <h2 className="flex-1 text-sm font-semibold">Speech builder</h2>
        <div className="seg">
          <button aria-pressed={speech === 'summary'} onClick={() => setSpeech('summary')} className="!px-2 text-xs">
            Summary
          </button>
          <button aria-pressed={speech === 'ff'} onClick={() => setSpeech('ff')} className="!px-2 text-xs">
            Final focus
          </button>
        </div>
        <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose} aria-label="Close speech builder" title="Close (S)">
          <X size={15} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
        <Group title="Our case" hint="Go for one or two and drop the rest">
          {ours.map((it) => (
            <ItemRow key={it.rowId} item={it} goLabel="Extend" />
          ))}
          {ours.length === 0 && <Empty>Nothing on your case sheet yet.</Empty>}
        </Group>
        <Group title="Their case" hint="Answer what they’ll go for">
          {theirs.map((it) => (
            <ItemRow key={it.rowId} item={it} goLabel="Answer" />
          ))}
          {theirs.length === 0 && <Empty>Nothing on their case sheet yet.</Empty>}
        </Group>

        <section className="mt-5">
          <h3 className="eyebrow mb-2">Weighing</h3>
          <div className="mb-2 flex flex-wrap gap-1">
            {WEIGHING_WORDS.map((w) => (
              <button
                key={w}
                className="rounded-full border border-line px-2 py-0.5 text-xs text-muted hover:border-accent hover:text-accent-text"
                onClick={() => setW((cur) => (cur && !cur.endsWith('\n') ? `${cur}\n${w}: ` : `${cur}${w}: `))}
              >
                + {w}
              </button>
            ))}
          </div>
          <textarea
            ref={wRef}
            rows={3}
            value={weighing}
            onChange={(e) => setW(e.target.value)}
            placeholder="Why your impacts come first: compare, don’t just repeat."
            className="input min-h-20 resize-none overflow-hidden"
            aria-label="Weighing"
          />
        </section>
      </div>

      <div className="space-y-2 border-t border-line bg-surface-2/60 px-4 py-3">
        {advice && (
          <p className="flex gap-2 text-xs text-warn">
            <AlertTriangle size={14} className="shrink-0" /> {advice}
          </p>
        )}
        {needsWork.length > 0 && (
          <p className="flex gap-2 text-xs text-danger">
            <ShieldAlert size={14} className="shrink-0" /> {needsWork.length} argument{needsWork.length > 1 ? 's' : ''} you’re going for {needsWork.length > 1 ? 'have' : 'has'} nothing from your side yet.
          </p>
        )}
        <div className="flex items-center gap-2">
          <div className="mr-auto">
            <div className={`font-mono text-lg font-semibold tabular-nums ${seconds > target ? 'text-danger' : ''}`}>
              ~{clock(seconds)} <span className="text-xs font-normal text-faint">/ {clock(target)}</span>
            </div>
            <div className="text-[0.68rem] text-faint">at {wpm} wpm, from what’s on the flow</div>
          </div>
          <button
            className="btn btn-sm"
            disabled={!outline.length}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(outlineText(outline));
                toast('Outline copied.', 'success');
              } catch {
                toast('Couldn’t copy. Your browser blocked clipboard access.', 'error');
              }
            }}
          >
            <ClipboardCopy size={13} /> Copy
          </button>
          <button className="btn btn-primary btn-sm" disabled={!outline.length} onClick={() => setReading(true)}>
            <BookOpenText size={13} /> Read
          </button>
        </div>
      </div>

      {reading && (
        <ReadingMode title={speech === 'ff' ? 'Final focus' : 'Summary'} blocks={outline} targetSeconds={target} onClose={() => setReading(false)} />
      )}
    </aside>
  );
}

function Group({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="mb-4">
      <div className="mb-2 flex items-baseline gap-2">
        <h3 className="eyebrow">{title}</h3>
        <span className="text-[0.68rem] text-faint">{hint}</span>
      </div>
      <ul className="space-y-1.5">{children}</ul>
    </section>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => <li className="text-xs text-faint">{children}</li>;

function ItemRow({ item: it, goLabel }: { item: SummaryItem; goLabel: string }) {
  const [open, setOpen] = useState(false);
  const going = it.plan === 'go';
  const s = STATUS[it.status];
  return (
    <li className={`rounded-lg border px-3 py-2 transition-opacity ${going ? 'border-line' : 'border-dashed border-line opacity-55'}`}>
      <div className="flex items-start gap-2">
        <button className="min-w-0 flex-1 text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
          <div className="truncate text-sm font-medium">{it.title}</div>
          <span className={`mt-1 inline-block rounded px-1.5 py-px text-[0.65rem] font-semibold ${s.tone}`}>{s.text}</span>
        </button>
        <div className="seg shrink-0">
          <button aria-pressed={going} onClick={() => setRowPlan(it.rowId, 'go')} className="!px-2 text-xs">
            {going && <Check size={11} className="mr-0.5 inline" />}
            {goLabel}
          </button>
          <button aria-pressed={!going} onClick={() => setRowPlan(it.rowId, 'drop')} className="!px-2 text-xs">
            Drop
          </button>
        </div>
      </div>
      {open && (
        <div className="mt-2 space-y-1.5 border-t border-line pt-2 text-xs whitespace-pre-line">
          <div>
            <span className="font-semibold text-muted">They said: </span>
            {it.against || <span className="text-faint">nothing</span>}
          </div>
          <div>
            <span className="font-semibold text-muted">We said: </span>
            {it.ours || <span className="text-faint">nothing</span>}
          </div>
        </div>
      )}
    </li>
  );
}
