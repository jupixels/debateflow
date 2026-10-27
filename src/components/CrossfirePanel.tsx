import { useLiveQuery } from 'dexie-react-hooks';
import { Check, ChevronDown, CornerDownLeft, CornerUpLeft, HelpCircle, MessagesSquare, Star, Trash2, X } from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { db } from '../db';
import { useAutosize } from '../hooks/useAutosize';
import { addCxEntry, deleteCxEntry, formatConcession, updateCxEntry } from '../lib/repo';
import { CX_SEGMENTS, type CxEntry, type CxSegment, type Round, type Side } from '../types';

const SEGMENT_NAMES: Record<CxSegment, string> = { CF1: 'First', CF2: 'Second', GCF: 'Grand' };

interface Props {
  round: Round;
  /** Timer's current segment, used to pick which crossfire to log into. */
  timerSegment: string;
  /** Opponent arguments linked on their sheet, used to rank prepared questions. */
  linkedArgumentIds: string[];
  onInsert: (text: string) => void;
  onClose: () => void;
}

export function CrossfirePanel({ round, timerSegment, linkedArgumentIds, onInsert, onClose }: Props) {
  const theirSide: Side = round.ourSide === 'PRO' ? 'CON' : 'PRO';
  const [segment, setSegment] = useState<CxSegment>(() => latestCx(timerSegment));
  useEffect(() => {
    if ((CX_SEGMENTS as readonly string[]).includes(timerSegment)) setSegment(timerSegment as CxSegment);
  }, [timerSegment]);

  const loaded = useLiveQuery(() => db.cx.where('roundId').equals(round.id).sortBy('createdAt'), [round.id]);
  const entries = useMemo(() => loaded ?? [], [loaded]);
  const theirArgs = useLiveQuery(
    () => db.args.where('resolutionId').equals(round.resolutionId).filter((a) => a.side === theirSide).toArray(),
    [round.resolutionId, theirSide],
  );
  const questions = useLiveQuery(async () => {
    if (!theirArgs?.length) return [];
    return db.questions.where('argumentId').anyOf(theirArgs.map((a) => a.id)).toArray();
  }, [theirArgs]);

  const [asker, setAsker] = useState<Side>(round.ourSide);
  const [q, setQ] = useState('');
  const [a, setA] = useState('');
  const qRef = useRef<HTMLTextAreaElement>(null);
  const aRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLOListElement>(null);

  const segEntries = entries.filter((e) => e.segment === segment);
  const concessions = entries.filter((e) => e.concession);
  const asked = useMemo(() => new Set(entries.map((e) => e.question.trim().toLowerCase())), [entries]);

  // Questions for arguments they're actually running first, then the rest.
  const prepared = useMemo(() => {
    const titles = new Map(theirArgs?.map((x) => [x.id, x.title]));
    return (questions ?? [])
      .map((x) => ({ ...x, argTitle: titles.get(x.argumentId) ?? '', linked: linkedArgumentIds.includes(x.argumentId) }))
      .sort((x, y) => Number(y.linked) - Number(x.linked) || x.argTitle.localeCompare(y.argTitle));
  }, [questions, theirArgs, linkedArgumentIds]);

  const log = async (concession = false) => {
    if (!q.trim() && !a.trim()) return;
    await addCxEntry({ roundId: round.id, segment, asker, question: q.trim(), answer: a.trim(), concession });
    setQ('');
    setA('');
    qRef.current?.focus();
    requestAnimationFrame(() => logRef.current?.lastElementChild?.scrollIntoView({ block: 'nearest' }));
  };

  const composerKey = (field: 'q' | 'a') => (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) log(true);
    else if (field === 'q') aRef.current?.focus();
    else log(false);
  };

  return (
    <aside
      className="animate-slide flex h-full w-full flex-col border-l border-line bg-surface sm:w-[23rem]"
      aria-label="Crossfire"
      onKeyDown={(e) => e.key === 'Escape' && (e.target as HTMLElement).blur()}
    >
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <MessagesSquare size={16} className="text-accent-text" />
        <h2 className="flex-1 text-sm font-semibold">Crossfire</h2>
        <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose} aria-label="Close crossfire panel" title="Close (X)">
          <X size={15} />
        </button>
      </div>

      <div className="border-b border-line px-4 py-3">
        <div className="seg w-full" role="tablist">
          {CX_SEGMENTS.map((s) => (
            <button key={s} role="tab" aria-selected={segment === s} onClick={() => setSegment(s)} className="text-xs">
              {SEGMENT_NAMES[s]}
              <span className="ml-1 text-faint tabular-nums">{entries.filter((e) => e.segment === s).length || ''}</span>
            </button>
          ))}
        </div>

        <div className="mt-3 rounded-lg border border-line bg-surface-2 p-2 focus-within:border-accent">
          <div className="mb-1.5 flex items-center gap-1">
            {[round.ourSide, theirSide].map((s) => (
              <button
                key={s}
                onClick={() => setAsker(s)}
                aria-pressed={asker === s}
                className={`rounded-md px-2 py-0.5 text-xs font-medium ${asker === s ? 'bg-accent text-accent-ink' : 'text-muted hover:text-fg'}`}
              >
                {s === round.ourSide ? 'We ask' : 'They ask'}
              </button>
            ))}
          </div>
          <textarea
            ref={qRef}
            rows={1}
            className="block w-full resize-none bg-transparent px-1 py-1 text-sm outline-none placeholder:text-faint"
            placeholder="Question"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={composerKey('q')}
          />
          <div className="my-1 border-t border-line" />
          <textarea
            ref={aRef}
            rows={2}
            className="block w-full resize-none bg-transparent px-1 py-1 text-sm outline-none placeholder:text-faint"
            placeholder="Answer"
            value={a}
            onChange={(e) => setA(e.target.value)}
            onKeyDown={composerKey('a')}
          />
          <div className="mt-1.5 flex items-center justify-end gap-1.5">
            <span className="mr-auto text-[0.68rem] text-faint">
              <kbd>Enter</kbd> next · <kbd>Ctrl</kbd>+<kbd>Enter</kbd> concession
            </span>
            <button className="btn btn-sm" onClick={() => log(true)} title="Log as a concession you can use later">
              <Star size={12} /> Concession
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => log(false)}>
              <CornerDownLeft size={12} /> Log
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <ol ref={logRef} className="space-y-2 px-4 py-3">
          {segEntries.map((e) => (
            <EntryRow key={e.id} entry={e} round={round} onInsert={onInsert} />
          ))}
          {segEntries.length === 0 && (
            <li className="py-4 text-center text-xs text-faint">Nothing logged in {SEGMENT_NAMES[segment].toLowerCase()} crossfire yet.</li>
          )}
        </ol>

        <Section title="Concessions" count={concessions.length} defaultOpen>
          {concessions.length === 0 ? (
            <p className="text-xs text-faint">Star an answer to keep it here. Insert it into your rebuttal or summary with one click, or with <kbd>/</kbd> in a cell.</p>
          ) : (
            <ul className="space-y-1.5">
              {concessions.map((e) => (
                <li key={e.id} className="flex items-start gap-2 rounded-lg bg-warn/10 px-2.5 py-2 text-sm">
                  <Star size={13} className="mt-0.5 shrink-0 fill-warn text-warn" />
                  <span className="min-w-0 flex-1">
                    {e.answer || e.question}
                    <span className="ml-1 font-mono text-[0.65rem] text-faint">{e.segment}</span>
                  </span>
                  <button className="btn btn-sm shrink-0" onClick={() => onInsert(formatConcession(e))} title="Insert into the last flow cell you used">
                    <CornerUpLeft size={12} /> Insert
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Prepared questions" count={prepared.length} defaultOpen>
          {prepared.length === 0 ? (
            <p className="text-xs text-faint">Add CX questions to opponent arguments in your bank and they’ll appear here.</p>
          ) : (
            <ul className="space-y-1">
              {prepared.map((p) => {
                const done = asked.has(p.text.trim().toLowerCase());
                return (
                  <li key={p.id}>
                    <button
                      className={`flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-surface-3/60 ${done ? 'text-faint line-through' : ''}`}
                      onClick={() => {
                        setAsker(round.ourSide);
                        setQ(p.text);
                        aRef.current?.focus();
                      }}
                      title="Use this question"
                    >
                      {done ? <Check size={14} className="mt-0.5 shrink-0 text-ok" /> : <HelpCircle size={14} className="mt-0.5 shrink-0 text-accent-text" />}
                      <span className="min-w-0 flex-1">
                        {p.text}
                        <span className={`block truncate text-[0.68rem] ${p.linked ? 'text-accent-text' : 'text-faint'}`}>{p.argTitle}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      </div>
    </aside>
  );
}

function latestCx(timerSegment: string): CxSegment {
  if ((CX_SEGMENTS as readonly string[]).includes(timerSegment)) return timerSegment as CxSegment;
  return 'CF1';
}

function Section({ title, count, defaultOpen, children }: { title: string; count: number; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <section className="border-t border-line px-4 py-3">
      <button className="flex w-full items-center gap-2" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="eyebrow flex-1 text-left">
          {title} <span className="ml-1 font-normal">{count || ''}</span>
        </span>
        <ChevronDown size={14} className={`text-faint transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && <div className="mt-2">{children}</div>}
    </section>
  );
}

function EntryRow({ entry: e, round, onInsert }: { entry: CxEntry; round: Round; onInsert: (t: string) => void }) {
  const ours = e.asker === round.ourSide;
  return (
    <li className={`group rounded-lg border px-3 py-2 ${e.concession ? 'border-warn/50 bg-warn/5' : 'border-line'}`}>
      <div className="flex items-start gap-2">
        <span
          className={`mt-0.5 shrink-0 rounded px-1 font-mono text-[0.6rem] font-bold ${ours ? 'bg-accent-soft text-accent-text' : 'bg-surface-3 text-muted'}`}
        >
          {ours ? 'US' : 'THEM'}
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <InlineEdit value={e.question} placeholder="Question" className="font-medium" onSave={(v) => updateCxEntry(e.id, { question: v })} />
          <InlineEdit value={e.answer} placeholder="Answer" className="text-muted" onSave={(v) => updateCxEntry(e.id, { answer: v })} />
        </div>
        <div className="flex shrink-0 flex-col items-center gap-0.5">
          <button
            onClick={() => updateCxEntry(e.id, { concession: !e.concession })}
            className={`btn btn-ghost btn-sm btn-icon ${e.concession ? 'text-warn' : 'text-faint'}`}
            aria-label={e.concession ? 'Unmark concession' : 'Mark as concession'}
            aria-pressed={e.concession}
            title="Concession"
          >
            <Star size={14} className={e.concession ? 'fill-warn' : ''} />
          </button>
          <button
            className="btn btn-ghost btn-sm btn-icon text-faint opacity-0 group-hover:opacity-100 focus:opacity-100 pointer-coarse:opacity-100"
            onClick={() => onInsert(formatConcession(e))}
            aria-label="Insert into flow"
            title="Insert into flow"
          >
            <CornerUpLeft size={13} />
          </button>
          <button
            className="btn btn-ghost btn-sm btn-icon btn-danger opacity-0 group-hover:opacity-100 focus:opacity-100 pointer-coarse:opacity-100"
            onClick={() => deleteCxEntry(e.id)}
            aria-label="Delete entry"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </li>
  );
}

function InlineEdit({ value, placeholder, className, onSave }: { value: string; placeholder: string; className?: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => setV(value), [value]);
  useAutosize(ref, [v]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={v}
      placeholder={placeholder}
      aria-label={placeholder}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== value && onSave(v.trim())}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      className={`block w-full resize-none bg-transparent text-sm leading-snug outline-none placeholder:text-faint focus:rounded focus:bg-surface-2 ${className ?? ''}`}
    />
  );
}
