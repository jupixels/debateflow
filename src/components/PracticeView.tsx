import { useLiveQuery } from 'dexie-react-hooks';
import { Eye, Layers, Lightbulb, RotateCcw, Shield, Trophy, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { db } from '../db';
import { useLabels } from '../hooks/useLabels';
import {
  GRADES,
  type Grade,
  buildQueue,
  countDeck,
  formatInterval,
  nextInterval,
  shuffle,
} from '../lib/flashcards';
import { recordReview, resetReviews } from '../lib/repo';
import { confirmAction, toast, useApp } from '../store';
import { type Argument, type BankResponse, KIND_NAMES, type Review } from '../types';
import { KindBadge } from './KindBadge';
import { EmptyState } from './ui';

type Deck = 'all' | 'theirs' | 'frontlines';
type Mode = 'cards' | 'blocks';

interface Card {
  key: string;
  argument: Argument;
  /** One response in card mode; every response to the argument in block mode. */
  responses: BankResponse[];
}

const GRADE_LABEL: Record<Grade, string> = { again: 'Forgot', hard: 'Hard', good: 'Got it', easy: 'Easy' };
const GRADE_TONE: Record<Grade, string> = {
  again: 'border-danger/40 text-danger hover:bg-danger/10',
  hard: 'border-warn/50 text-warn hover:bg-warn/10',
  good: 'border-ok/50 text-ok hover:bg-ok/10',
  easy: 'border-accent/50 text-accent-text hover:bg-accent-soft',
};

export function PracticeView() {
  const { resolutionId, selectResolution, role, practiceArgumentId, practiceArgument } = useApp();
  const label = useLabels();
  const resolutions = useLiveQuery(() => db.resolutions.orderBy('createdAt').toArray(), []);
  const resId = resolutionId ?? resolutions?.[0]?.id ?? null;
  const args = useLiveQuery(() => (resId ? db.args.where('resolutionId').equals(resId).sortBy('createdAt') : []), [resId]);
  const responses = useLiveQuery(async () => {
    if (!args?.length) return [];
    return db.responses.where('argumentId').anyOf(args.map((a) => a.id)).sortBy('createdAt');
  }, [args]);
  const reviewList = useLiveQuery(() => db.reviews.toArray(), []);
  const reviews = useMemo(() => new Map((reviewList ?? []).map((r) => [r.id, r])), [reviewList]);

  const roleDeck: Deck = role === 'CONSTRUCTIVE' ? 'frontlines' : role === 'BOTH' ? 'all' : 'theirs';
  const [deck, setDeck] = useState<Deck>(roleDeck);
  // Follow a role change made while this screen is open.
  useEffect(() => {
    setDeck(roleDeck);
  }, [roleDeck]);
  const [mode, setMode] = useState<Mode>('cards');
  const [session, setSession] = useState<{ cards: Card[]; mode: Mode; title: string } | null>(null);
  const now = Date.now();

  const argById = useMemo(() => new Map((args ?? []).map((a) => [a.id, a])), [args]);
  const inDeck = useCallback(
    (a: Argument | undefined) => !!a && (deck === 'all' || (deck === 'frontlines') === !!a.caseId),
    [deck],
  );
  const deckResponses = useMemo(() => (responses ?? []).filter((r) => inDeck(argById.get(r.argumentId))), [responses, argById, inDeck]);
  const counts = countDeck(deckResponses, reviews, now);

  const start = useCallback(
    (pool: BankResponse[], opts: { all?: boolean; title: string; mode?: Mode }) => {
      const m = opts.mode ?? mode;
      const picked = buildQueue(pool, reviews, Date.now(), { all: opts.all });
      let cards: Card[];
      if (m === 'cards') {
        // Keep the schedule's due-first order, but mix within the new cards.
        const due = picked.filter((r) => reviews.has(r.id));
        const fresh = shuffle(picked.filter((r) => !reviews.has(r.id)));
        cards = (opts.all ? shuffle(picked) : [...due, ...fresh]).map((r) => ({ key: r.id, argument: argById.get(r.argumentId)!, responses: [r] }));
      } else {
        // Blocks: every argument with at least one card to study, quizzed on all its responses.
        const argIds = [...new Set(picked.map((r) => r.argumentId))];
        cards = shuffle(argIds).map((id) => ({
          key: id,
          argument: argById.get(id)!,
          responses: pool.filter((r) => r.argumentId === id),
        }));
      }
      if (!cards.length) {
        toast('Nothing to study right now. Come back later, or review everything.');
        return;
      }
      setSession({ cards, mode: m, title: opts.title });
    },
    [mode, reviews, argById],
  );

  // Opened from an argument in the Bank: drill that argument straight away. Its cards are
  // read directly, because the lists above may still be loading (or stale) on first render.
  useEffect(() => {
    if (!practiceArgumentId) return;
    practiceArgument(null);
    void (async () => {
      const a = await db.args.get(practiceArgumentId);
      if (!a) return;
      if (a.resolutionId !== resId) selectResolution(a.resolutionId);
      const pool = await db.responses.where('argumentId').equals(a.id).sortBy('createdAt');
      const found = new Map((await db.reviews.bulkGet(pool.map((r) => r.id))).filter((r): r is Review => !!r).map((r) => [r.id, r]));
      const cards = shuffle(buildQueue(pool, found, Date.now(), { all: true })).map((r) => ({ key: r.id, argument: a, responses: [r] }));
      if (cards.length) setSession({ cards, mode: 'cards', title: a.title });
    })();
  }, [practiceArgumentId, practiceArgument, resId, selectResolution]);

  if (session) {
    return <Session key={session.title + session.cards.length} {...session} reviews={reviews} onExit={() => setSession(null)} />;
  }
  if (!resolutions || !args || !responses) return null;
  if (!resolutions.length || !responses.length) {
    return (
      <EmptyState
        icon={<Layers size={20} />}
        title="No cards yet"
        action={
          <button className="btn btn-primary" onClick={() => useApp.getState().setView('bank')}>
            Go to the Bank
          </button>
        }
      >
        Every response you save in the Bank becomes a flashcard here. Write a few, then come back to drill them.
      </EmptyState>
    );
  }

  const deckArgs = (args ?? []).filter(inDeck);
  const toStudy = counts.due + Math.min(20, counts.new);

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold tracking-tight">Practice your responses</h1>
            <p className="mt-1 text-sm text-muted">Say your answer out loud, flip the card, and be honest about how it went. Cards you know come back less often.</p>
          </div>
          {resolutions.length > 1 && (
            <select className="input w-auto max-w-xs" value={resId ?? ''} onChange={(e) => selectResolution(e.target.value)} aria-label="Resolution">
              {resolutions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="card mt-5 p-5">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <Stat value={counts.due} label="due" tone="text-warn" />
            <Stat value={counts.new} label="new" tone="text-accent-text" />
            <Stat value={counts.learned} label="learned" tone="text-ok" />
            <div className="min-w-40 flex-1">
              <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                <div className="h-full bg-ok transition-[width]" style={{ width: `${counts.total ? (counts.learned / counts.total) * 100 : 0}%` }} />
              </div>
              <div className="mt-1 text-xs text-faint">
                {counts.learned} of {counts.total} cards learned
              </div>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div>
              <span className="label">Cards</span>
              <div className="seg">
                {(
                  [
                    ['theirs', 'Responses'],
                    ['frontlines', 'Frontlines'],
                    ['all', 'Both'],
                  ] as const
                ).map(([id, text]) => (
                  <button key={id} aria-pressed={deck === id} onClick={() => setDeck(id)}>
                    {text}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="label">Mode</span>
              <div className="seg">
                <button aria-pressed={mode === 'cards'} onClick={() => setMode('cards')} title="One response per card">
                  One at a time
                </button>
                <button aria-pressed={mode === 'blocks'} onClick={() => setMode('blocks')} title="Name every response to an argument">
                  Whole blocks
                </button>
              </div>
            </div>
            <button className="btn btn-primary ml-auto h-10 px-5" disabled={!toStudy} onClick={() => start(deckResponses, { title: 'Today’s cards' })}>
              {toStudy ? `Study ${mode === 'cards' ? `${toStudy} card${toStudy === 1 ? '' : 's'}` : 'blocks'}` : 'All caught up'}
            </button>
          </div>
          {!toStudy && counts.total > 0 && (
            <p className="mt-3 text-xs text-muted">
              Nothing is due. Use <b>Review all</b> on an argument below to drill it anyway, for example the night before a tournament.
            </p>
          )}
        </div>

        <h2 className="eyebrow mt-7 mb-2">By argument</h2>
        <ul className="space-y-2">
          {deckArgs.map((a) => {
            const pool = deckResponses.filter((r) => r.argumentId === a.id);
            if (!pool.length) return null;
            const c = countDeck(pool, reviews, now);
            return (
              <li key={a.id} className="card flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-[14rem] flex-1">
                  <div className="flex items-center gap-2">
                    {a.caseId ? (
                      <Shield size={14} className="shrink-0 text-accent-text" aria-label="Your contention" />
                    ) : (
                      <span className="rounded bg-surface-3 px-1 text-[0.6rem] font-semibold text-muted">{label.side(a.side)}</span>
                    )}
                    <span className="truncate font-medium">{a.title}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex h-1.5 w-32 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
                      <div className="bg-ok" style={{ width: `${(c.learned / c.total) * 100}%` }} />
                      <div className="bg-accent/60" style={{ width: `${((c.total - c.learned - c.new) / c.total) * 100}%` }} />
                    </div>
                    <span className="text-xs text-muted">
                      {c.total} card{c.total === 1 ? '' : 's'}
                      {c.due > 0 && <span className="text-warn"> · {c.due} due</span>}
                      {c.new > 0 && <span> · {c.new} new</span>}
                      {c.learned > 0 && <span className="text-ok"> · {c.learned} learned</span>}
                    </span>
                  </div>
                </div>
                <button className="btn btn-sm" disabled={!c.due && !c.new} onClick={() => start(pool, { title: a.title })}>
                  Study
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => start(pool, { all: true, title: a.title })}>
                  Review all
                </button>
                <button
                  className="btn btn-ghost btn-sm btn-icon text-faint"
                  title="Reset progress for this argument"
                  aria-label={`Reset progress for ${a.title}`}
                  disabled={c.new === c.total}
                  onClick={async () => {
                    if (await confirmAction('Reset progress?', `All cards for “${a.title}” become new again.`, 'Reset')) {
                      await resetReviews(pool.map((r) => r.id));
                    }
                  }}
                >
                  <RotateCcw size={13} />
                </button>
              </li>
            );
          })}
        </ul>
        {!deckResponses.length && (
          <p className="py-6 text-center text-sm text-muted">
            {deck === 'frontlines' ? 'No frontlines yet. Add them to your contentions in the Case tab.' : 'No responses in this deck yet.'}
          </p>
        )}
      </div>
    </div>
  );
}

function Stat({ value, label, tone }: { value: number; label: string; tone: string }) {
  return (
    <div>
      <div className={`font-mono text-3xl font-semibold tabular-nums ${tone}`}>{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

function Session({ cards: initial, mode, title, reviews, onExit }: { cards: Card[]; mode: Mode; title: string; reviews: Map<string, Review>; onExit: () => void }) {
  const label = useLabels();
  const [queue, setQueue] = useState(initial);
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(false);
  const [hint, setHint] = useState(false);
  const [tally, setTally] = useState<Record<Grade, number>>({ again: 0, hard: 0, good: 0, easy: 0 });
  const card = queue[index];
  const done = !card;

  const grade = useCallback(
    async (g: Grade) => {
      if (!card || !shown) return;
      const now = Date.now();
      await Promise.all(card.responses.map((r) => recordReview(r.id, g, now)));
      setTally((t) => ({ ...t, [g]: t[g] + 1 }));
      // A forgotten card comes back a few cards later in this session.
      if (g === 'again') setQueue((q) => [...q.slice(0, index + 4), card, ...q.slice(index + 4)]);
      setIndex((i) => i + 1);
      setShown(false);
      setHint(false);
    },
    [card, shown, index],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || document.querySelector('[role="dialog"]')) return;
      if (e.key === 'Escape') onExit();
      else if (done) return;
      else if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        if (!shown) setShown(true);
        else void grade('good');
      } else if (shown && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        void grade(GRADES[Number(e.key) - 1]);
      } else if (e.key.toLowerCase() === 'h') setHint(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [done, shown, grade, onExit]);

  const reviewed = tally.again + tally.hard + tally.good + tally.easy;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-line bg-surface px-4 py-2.5">
        <Layers size={16} className="text-accent-text" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{title}</div>
          <div className="text-xs text-muted">{mode === 'cards' ? 'One response at a time' : 'Whole blocks'}</div>
        </div>
        <span className="font-mono text-sm text-muted tabular-nums">
          {Math.min(index + 1, queue.length)} / {queue.length}
        </span>
        <button className="btn btn-ghost btn-icon" onClick={onExit} aria-label="End practice" title="End (Esc)">
          <X size={18} />
        </button>
      </div>
      <div className="h-1 bg-surface-3">
        <div className="h-full bg-accent transition-[width]" style={{ width: `${(index / queue.length) * 100}%` }} />
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto flex min-h-full max-w-2xl flex-col justify-center px-4 py-8">
          {done ? (
            <div className="card animate-pop p-8 text-center">
              <div className="mx-auto mb-3 grid size-12 place-items-center rounded-xl bg-ok/15 text-ok">
                <Trophy size={22} />
              </div>
              <h2 className="text-lg font-semibold">Done for now</h2>
              <p className="mt-1 text-sm text-muted">
                {reviewed} card{reviewed === 1 ? '' : 's'} reviewed · {reviewed ? Math.round(((tally.good + tally.easy) / reviewed) * 100) : 0}% remembered
              </p>
              <div className="mt-4 flex justify-center gap-4 text-xs text-muted">
                {GRADES.map((g) => (
                  <span key={g}>
                    {GRADE_LABEL[g]}: <b className="text-fg">{tally[g]}</b>
                  </span>
                ))}
              </div>
              <button className="btn btn-primary mt-6" onClick={onExit}>
                Back to practice
              </button>
            </div>
          ) : (
            <div key={card.key + index} className="card animate-pop overflow-hidden">
              <div className="p-6 sm:p-8">
                <div className="eyebrow mb-2">{card.argument.caseId ? `Your contention · ${label.side(card.argument.side)}` : `Their argument · ${label.side(card.argument.side)}`}</div>
                <h2 className="text-xl leading-snug font-semibold sm:text-2xl">{card.argument.title}</h2>
                <Prompt card={card} mode={mode} />
                {!shown && (
                  <div className="mt-6 flex flex-wrap items-center gap-2">
                    <button className="btn btn-primary h-10 px-5" onClick={() => setShown(true)}>
                      <Eye size={15} /> Show answer <kbd className="ml-1 border-white/30 bg-transparent text-current">Space</kbd>
                    </button>
                    {!hint && (
                      <button className="btn btn-ghost" onClick={() => setHint(true)}>
                        <Lightbulb size={14} /> Hint <kbd>H</kbd>
                      </button>
                    )}
                    {hint && <HintText card={card} mode={mode} />}
                  </div>
                )}
              </div>

              {shown && (
                <>
                  <div className="animate-fade border-t border-line bg-surface-2/60 p-6 sm:px-8">
                    {card.responses.map((r, i) => (
                      <div key={r.id} className={i ? 'mt-4 border-t border-line pt-4' : ''}>
                        <div className="flex items-start gap-2">
                          <KindBadge kind={r.kind} className="mt-1" />
                          <div className="min-w-0 flex-1">
                            <div className="text-lg leading-snug font-semibold">{r.tag}</div>
                            {r.cite && <div className="mt-0.5 text-sm text-muted italic">{r.cite}</div>}
                          </div>
                          <span className="text-sm text-warn">{'★'.repeat(r.strength)}</span>
                        </div>
                        {r.text && mode === 'cards' && <p className="mt-2 max-h-56 overflow-auto text-sm leading-relaxed whitespace-pre-line text-muted">{r.text}</p>}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-t border-line p-4 sm:grid-cols-4">
                    {GRADES.map((g, i) => (
                      <button key={g} className={`btn h-auto flex-col gap-0 py-2 ${GRADE_TONE[g]}`} onClick={() => grade(g)}>
                        <span className="font-semibold">{GRADE_LABEL[g]}</span>
                        <span className="text-[0.7rem] font-normal text-faint">
                          <kbd className="mr-1">{i + 1}</kbd>
                          {formatInterval(Math.max(...card.responses.map((r) => nextInterval(reviews.get(r.id), g, Date.now()))))}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          {!done && (
            <p className="mt-4 text-center text-xs text-faint">
              {shown ? 'How well did you know it? Got it = you could say it in round.' : 'Say your answer out loud first, then flip.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Prompt({ card, mode }: { card: Card; mode: Mode }) {
  const own = !!card.argument.caseId;
  if (mode === 'blocks') {
    const n = card.responses.length;
    return (
      <p className="mt-4 text-muted">
        {own ? `Give all ${n} of your frontlines.` : `Give all ${n} of your responses.`}
      </p>
    );
  }
  const r = card.responses[0];
  if (own) {
    return (
      <div className="mt-4 space-y-1">
        {r.against && (
          <p className="text-muted">
            They say: <span className="font-medium text-fg">{r.against}</span>
          </p>
        )}
        <p className="text-muted">What’s your frontline?</p>
      </div>
    );
  }
  return (
    <p className="mt-4 flex flex-wrap items-center gap-2 text-muted">
      {r.kind === 'OTHER' ? (
        'What’s your response?'
      ) : (
        <>
          Give your <KindBadge kind={r.kind} /> <span className="font-medium text-fg">{KIND_NAMES[r.kind].toLowerCase()}</span>
          {r.isCard ? ' (card)' : ''}
        </>
      )}
    </p>
  );
}

function HintText({ card, mode }: { card: Card; mode: Mode }) {
  const firstWords = (s: string) => s.split(/\s+/).slice(0, 3).join(' ') + '…';
  return (
    <span className="animate-fade rounded-lg bg-warn/10 px-3 py-1.5 text-sm text-warn">
      {mode === 'blocks' ? (
        <span className="inline-flex flex-wrap gap-1">
          {card.responses.map((r) => (
            <KindBadge key={r.id} kind={r.kind} />
          ))}
        </span>
      ) : (
        <>Starts with “{firstWords(card.responses[0].tag)}”</>
      )}
    </span>
  );
}

