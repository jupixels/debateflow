import { useLiveQuery } from 'dexie-react-hooks';
import {
  ArrowDown,
  ArrowUp,
  BookOpenText,
  Copy,
  FileText,
  Gauge,
  MessageSquareQuote,
  Pencil,
  Plus,
  ScrollText,
  Shield,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { db } from '../db';
import { useAutosize } from '../hooks/useAutosize';
import { useLabels } from '../hooks/useLabels';
import { clock, timeline } from '../lib/caseTime';
import { addSection, createCase, deleteCase, deleteSection, duplicateCase, moveSection, renameCase, updateSection } from '../lib/repo';
import { confirmAction, toast, useApp } from '../store';
import type { Argument, Case, CaseSection, Side } from '../types';
import { ArgumentDetail, ResolutionPicker } from './BankView';
import { ReadingMode } from './ReadingMode';
import { EmptyState, Modal, ModalHeader } from './ui';

const CONSTRUCTIVE_SECONDS = 240;

export function CaseView() {
  const { resolutionId, caseId, selectCase } = useApp();
  const label = useLabels();
  const resolutions = useLiveQuery(() => db.resolutions.count(), []);
  const cases = useLiveQuery(
    () => (resolutionId ? db.cases.where('resolutionId').equals(resolutionId).sortBy('createdAt') : []),
    [resolutionId],
  );

  useEffect(() => {
    if (cases && !cases.some((c) => c.id === caseId)) selectCase(cases[0]?.id ?? null);
  }, [cases, caseId, selectCase]);

  const newCase = async (side: Side) => {
    if (!resolutionId) return;
    const n = (cases?.filter((c) => c.side === side).length ?? 0) + 1;
    const c = await createCase(resolutionId, side, `${label.side(side)} case${n > 1 ? ` ${n}` : ''}`);
    selectCase(c.id);
  };

  if (resolutions === 0) {
    return (
      <EmptyState icon={<ScrollText size={20} />} title="Add a resolution first">
        Your cases are organized by resolution. Add one in the Bank tab.
      </EmptyState>
    );
  }
  const current = cases?.find((c) => c.id === caseId);

  return (
    <div className="flex h-full flex-col md:flex-row">
      <aside className="flex max-h-[40vh] shrink-0 flex-col border-b border-line bg-surface md:max-h-none md:w-72 md:border-r md:border-b-0">
        <ResolutionPicker />
        <div className="min-h-0 flex-1 overflow-auto px-3 pb-4">
          {(['PRO', 'CON'] as Side[]).map((side) => (
            <div key={side} className="mt-4">
              <div className="mb-1 flex items-center px-1">
                <span className="eyebrow flex-1">{label.side(side)} cases</span>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => newCase(side)} aria-label={`New ${label.side(side)} case`}>
                  <Plus size={15} />
                </button>
              </div>
              <ul className="space-y-0.5">
                {cases
                  ?.filter((c) => c.side === side)
                  .map((c) => (
                    <li key={c.id}>
                      <button className="nav-item" aria-current={c.id === caseId} onClick={() => selectCase(c.id)}>
                        <FileText size={14} className="shrink-0 text-faint" />
                        <span className="flex-1 truncate">{c.title}</span>
                      </button>
                    </li>
                  ))}
              </ul>
              {!cases?.some((c) => c.side === side) && (
                <button className="nav-item text-muted" onClick={() => newCase(side)}>
                  <Plus size={14} /> New {label.side(side).toLowerCase()} case
                </button>
              )}
            </div>
          ))}
        </div>
      </aside>
      <section className="min-h-0 min-w-0 flex-1 overflow-auto">
        {current ? (
          <CaseEditor key={current.id} c={current} />
        ) : (
          <EmptyState icon={<ScrollText size={20} />} title="Write your case">
            Create a Pro or Con case on the left. You’ll get a live time estimate, a reading mode with a timer, and frontline prep for each contention.
          </EmptyState>
        )}
      </section>
    </div>
  );
}

function CaseEditor({ c }: { c: Case }) {
  const { wpm, setWpm, selectCase } = useApp();
  const label = useLabels();
  const sections = useLiveQuery(async () => (await db.sections.where('caseId').equals(c.id).toArray()).sort((a, b) => a.order - b.order), [c.id]);
  // By id, not caseId: a duplicated case shares its original's contention arguments.
  const args = useLiveQuery(async () => {
    const ids = (sections ?? []).map((s) => s.argumentId).filter((x): x is string => !!x);
    return (await db.args.bulkGet(ids)).filter((a): a is Argument => !!a);
  }, [sections]);
  const prepCounts = useLiveQuery(async () => {
    const ids = (sections ?? []).map((s) => s.argumentId).filter((x): x is string => !!x);
    const m = new Map<string, { fl: number; q: number }>();
    for (const id of ids) {
      m.set(id, { fl: await db.responses.where('argumentId').equals(id).count(), q: await db.questions.where('argumentId').equals(id).count() });
    }
    return m;
  }, [sections]);
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(c.title);
  const [reading, setReading] = useState(false);
  const [prepFor, setPrepFor] = useState<CaseSection | null>(null);

  // Live text from the editors so the estimate updates while typing, before saves land.
  const [draft, setDraft] = useState<Record<string, { title: string; body: string }>>({});
  const blocks = useMemo(
    () => (sections ?? []).map((s) => ({ id: s.id, title: draft[s.id]?.title ?? s.title, body: draft[s.id]?.body ?? s.body })),
    [sections, draft],
  );
  const plan = useMemo(() => timeline(blocks.map((b) => ({ id: b.id, text: `${b.title} ${b.body}` })), wpm), [blocks, wpm]);
  const over = plan.total - CONSTRUCTIVE_SECONDS;
  let contentionNo = 0;

  if (!sections) return null;
  const prepArg: Argument | undefined = prepFor ? args?.find((a) => a.id === prepFor.argumentId) : undefined;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="eyebrow mb-1">{label.side(c.side)} case</div>
          {renaming ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (title.trim()) await renameCase(c.id, title);
                setRenaming(false);
              }}
            >
              <input autoFocus className="input h-10 text-lg font-semibold" value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => setRenaming(false)} />
            </form>
          ) : (
            <h1 className="group flex items-center gap-2 text-xl font-semibold tracking-tight">
              {c.title}
              <button className="text-faint opacity-0 group-hover:opacity-100 hover:text-fg pointer-coarse:opacity-100" onClick={() => setRenaming(true)} aria-label="Rename case">
                <Pencil size={15} />
              </button>
            </h1>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button className="btn btn-primary" onClick={() => setReading(true)}>
            <BookOpenText size={15} /> Read
          </button>
          <button
            className="btn"
            title="Copy this case, e.g. for a lay version or a shorter cut. Frontlines are shared."
            onClick={async () => {
              const copy = await duplicateCase(c.id, `${c.title} (copy)`);
              if (copy) {
                selectCase(copy.id);
                toast('Case duplicated. Contentions share their frontlines with the original.', 'success');
              }
            }}
          >
            <Copy size={14} /> Duplicate
          </button>
          <button
            className="btn btn-ghost btn-danger btn-icon"
            aria-label="Delete case"
            onClick={async () => {
              if (await confirmAction(`Delete “${c.title}”?`, 'Frontlines and CX prep for its contentions are deleted too, unless another case still uses them.')) {
                await deleteCase(c.id);
                toast('Case deleted.');
              }
            }}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="card mt-5 p-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div>
            <div className="eyebrow">Estimated time</div>
            <div className={`font-mono text-2xl font-semibold tabular-nums ${over > 0 ? 'text-danger' : over > -10 ? 'text-warn' : ''}`}>
              {clock(plan.total)} <span className="text-sm font-normal text-faint">/ 4:00</span>
            </div>
            <div className="text-xs text-muted">
              {plan.blocks.reduce((n, b) => n + b.words, 0)} words ·{' '}
              {over > 0 ? <span className="text-danger">{clock(over)} over</span> : `${clock(-over)} to spare`}
            </div>
          </div>
          <label className="min-w-56 flex-1">
            <span className="label flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Gauge size={13} /> Your speaking speed
              </span>
              <span className="font-mono text-fg">{wpm} wpm</span>
            </span>
            <input type="range" min={120} max={330} step={5} value={wpm} onChange={(e) => setWpm(Number(e.target.value))} className="w-full accent-[var(--accent)]" />
            <span className="text-[0.7rem] text-faint">Lay rounds are often around 160 wpm; fast tech rounds 250+. Read for one minute and count to calibrate.</span>
          </label>
        </div>
        <div className="relative mt-4 flex h-2.5 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
          {plan.blocks.map((b, i) => (
            <div
              key={b.id}
              className={`h-full border-r border-surface ${sections[i]?.type === 'contention' ? 'bg-accent' : 'bg-faint/60'}`}
              style={{ width: `${(b.seconds / Math.max(plan.total, CONSTRUCTIVE_SECONDS)) * 100}%` }}
              title={`${blocks[i].title || 'Text'} · ${clock(b.seconds)}`}
            />
          ))}
          {plan.total > CONSTRUCTIVE_SECONDS && (
            <div className="absolute inset-y-0 w-0.5 bg-danger" style={{ left: `${(CONSTRUCTIVE_SECONDS / plan.total) * 100}%` }} title="4:00" />
          )}
        </div>
      </div>

      <ol className="mt-5 space-y-3">
        {sections.map((s, i) => {
          if (s.type === 'contention') contentionNo += 1;
          const t = plan.blocks[i];
          const counts = s.argumentId ? prepCounts?.get(s.argumentId) : undefined;
          return (
            <SectionCard
              key={s.id}
              section={s}
              number={s.type === 'contention' ? contentionNo : undefined}
              start={t?.start ?? 0}
              seconds={t?.seconds ?? 0}
              words={t?.words ?? 0}
              first={i === 0}
              last={i === sections.length - 1}
              prep={counts}
              onDraft={(d) => setDraft((all) => ({ ...all, [s.id]: d }))}
              onPrep={() => setPrepFor(s)}
            />
          );
        })}
      </ol>

      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn" onClick={() => addSection(c.id, 'contention')}>
          <Plus size={14} /> Contention
        </button>
        <button className="btn" onClick={() => addSection(c.id, 'text')}>
          <Plus size={14} /> Text block <span className="text-faint">(framework, overview, conclusion)</span>
        </button>
      </div>

      {reading && (
        <ReadingMode title={c.title} blocks={blocks} targetSeconds={CONSTRUCTIVE_SECONDS} onClose={() => setReading(false)} />
      )}
      {prepFor && prepArg && (
        <Modal label="Contention prep" onClose={() => setPrepFor(null)} width="max-w-3xl">
          <ModalHeader title={prepArg.title} subtitle="Frontlines and the questions they may ask about this contention" onClose={() => setPrepFor(null)} />
          <div className="max-h-[70vh] overflow-auto">
            <ArgumentDetail argument={prepArg} embedded />
          </div>
        </Modal>
      )}
    </div>
  );
}

function SectionCard({
  section: s,
  number,
  start,
  seconds,
  words,
  first,
  last,
  prep,
  onDraft,
  onPrep,
}: {
  section: CaseSection;
  number?: number;
  start: number;
  seconds: number;
  words: number;
  first: boolean;
  last: boolean;
  prep?: { fl: number; q: number };
  onDraft: (d: { title: string; body: string }) => void;
  onPrep: () => void;
}) {
  const [title, setTitle] = useState(s.title);
  const [body, setBody] = useState(s.body);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ title?: string; body?: string }>({});
  useAutosize(bodyRef, [body]);

  // Edits to title and body are merged so a quick switch between them never drops one.
  const flush = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const patch = pending.current;
    pending.current = {};
    if (Object.keys(patch).length) void updateSection(s.id, patch);
  };
  const save = (patch: { title?: string; body?: string }, now = false) => {
    pending.current = { ...pending.current, ...patch };
    if (timer.current) clearTimeout(timer.current);
    if (now) flush();
    else timer.current = setTimeout(flush, 400);
  };
  useEffect(() => flush, []); // eslint-disable-line react-hooks/exhaustive-deps

  const contention = s.type === 'contention';
  return (
    <li className={`group card overflow-hidden ${contention ? 'border-l-4 border-l-accent' : ''}`}>
      <div className="flex items-center gap-2 border-b border-line bg-surface-2/60 px-4 py-2">
        <span className={`rounded px-1.5 py-0.5 font-mono text-[0.65rem] font-bold ${contention ? 'bg-accent-soft text-accent-text' : 'bg-surface-3 text-muted'}`}>
          {contention ? `C${number}` : 'TEXT'}
        </span>
        <input
          className="h-7 min-w-0 flex-1 bg-transparent font-semibold outline-none placeholder:font-normal placeholder:text-faint"
          value={title}
          placeholder={contention ? 'Contention title' : 'Heading (optional), e.g. Framework'}
          onChange={(e) => {
            setTitle(e.target.value);
            onDraft({ title: e.target.value, body });
            save({ title: e.target.value });
          }}
          onBlur={() => save({ title }, true)}
          aria-label="Section title"
        />
        <span className="font-mono text-xs text-faint tabular-nums" title="Planned start in the speech">
          @{clock(start)}
        </span>
        <div className="flex opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 pointer-coarse:opacity-100">
          <button className="btn btn-ghost btn-sm btn-icon" disabled={first} onClick={() => moveSection(s.id, -1)} aria-label="Move up">
            <ArrowUp size={14} />
          </button>
          <button className="btn btn-ghost btn-sm btn-icon" disabled={last} onClick={() => moveSection(s.id, 1)} aria-label="Move down">
            <ArrowDown size={14} />
          </button>
          <button
            className="btn btn-ghost btn-sm btn-icon btn-danger"
            aria-label="Delete section"
            onClick={async () => {
              const msg = contention ? 'Its frontlines and CX prep are deleted too, unless another case still uses this contention.' : undefined;
              if (await confirmAction(`Delete ${contention ? `C${number}` : 'this block'}?`, msg)) await deleteSection(s.id);
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <textarea
        ref={bodyRef}
        rows={3}
        value={body}
        placeholder={contention ? 'Uniqueness, link, impact… paste cards right in.' : 'Write it out…'}
        onChange={(e) => {
          setBody(e.target.value);
          onDraft({ title, body: e.target.value });
          save({ body: e.target.value });
        }}
        onBlur={() => save({ body }, true)}
        className="block min-h-20 w-full resize-none overflow-hidden bg-transparent px-4 py-3 text-[0.95rem] leading-relaxed outline-none placeholder:text-faint"
        aria-label="Section text"
      />
      <div className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-2 text-xs text-muted">
        <span>
          {words} words · {clock(seconds)}
        </span>
        {contention && (
          <button className="btn btn-sm ml-auto" onClick={onPrep}>
            <Shield size={13} /> Frontlines <b>{prep?.fl ?? 0}</b>
            <span className="text-faint">·</span>
            <MessageSquareQuote size={13} /> CX <b>{prep?.q ?? 0}</b>
          </button>
        )}
      </div>
    </li>
  );
}
