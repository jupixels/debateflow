import type { BankResponse, Review } from '../types';

export type Grade = 'again' | 'hard' | 'good' | 'easy';
export const GRADES: Grade[] = ['again', 'hard', 'good', 'easy'];

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
/** Days until the next review for each box. */
export const BOX_DAYS = [0, 1, 3, 7, 16, 35];
export const MAX_BOX = BOX_DAYS.length - 1;
/** A card counts as learned once it reaches this box. */
export const LEARNED_BOX = 4;

/**
 * Leitner-style scheduling: a remembered card moves up a box and waits longer;
 * a missed card drops back to box 1 and comes back in a few minutes.
 */
export function rate(prev: Review | undefined, responseId: string, grade: Grade, now: number): Review {
  const box = prev?.box ?? 0;
  const base = { id: responseId, reviewedAt: now, reps: (prev?.reps ?? 0) + 1, lapses: prev?.lapses ?? 0 };
  switch (grade) {
    case 'again':
      return { ...base, box: 1, due: now + 5 * MINUTE, lapses: base.lapses + (box > 1 ? 1 : 0) };
    case 'hard': {
      const b = Math.max(1, box);
      return { ...base, box: b, due: now + Math.max(0.5, BOX_DAYS[b] / 2) * DAY };
    }
    case 'good': {
      const b = Math.min(MAX_BOX, box + 1);
      return { ...base, box: b, due: now + BOX_DAYS[b] * DAY };
    }
    case 'easy': {
      const b = Math.min(MAX_BOX, box + 2);
      return { ...base, box: b, due: now + BOX_DAYS[b] * DAY * 1.3 };
    }
  }
}

/** When the next review would be, for showing on the rating buttons. */
export const nextInterval = (prev: Review | undefined, grade: Grade, now: number) =>
  rate(prev, prev?.id ?? '', grade, now).due - now;

export function formatInterval(ms: number): string {
  if (ms < 60 * MINUTE) return `${Math.max(1, Math.round(ms / MINUTE))}m`;
  if (ms < DAY) return `${Math.round(ms / (60 * MINUTE))}h`;
  const d = Math.round(ms / DAY);
  return d < 30 ? `${d}d` : `${Math.round(d / 30)}mo`;
}

export type CardState = 'new' | 'due' | 'learning' | 'learned';

export function cardState(r: Review | undefined, now: number): CardState {
  if (!r) return 'new';
  if (r.due <= now) return 'due';
  return r.box >= LEARNED_BOX ? 'learned' : 'learning';
}

export interface DeckCounts {
  total: number;
  new: number;
  due: number;
  learned: number;
}

export function countDeck(responses: BankResponse[], reviews: Map<string, Review>, now: number): DeckCounts {
  const c: DeckCounts = { total: responses.length, new: 0, due: 0, learned: 0 };
  for (const r of responses) {
    const s = cardState(reviews.get(r.id), now);
    if (s === 'new') c.new += 1;
    else if (s === 'due') c.due += 1;
    else if (s === 'learned') c.learned += 1;
  }
  return c;
}

/**
 * What to study now: due cards first (most overdue first), then up to
 * `newLimit` new cards, your go-to responses first. `all` ignores the schedule.
 */
export function buildQueue(
  responses: BankResponse[],
  reviews: Map<string, Review>,
  now: number,
  { newLimit = 20, all = false }: { newLimit?: number; all?: boolean } = {},
): BankResponse[] {
  if (all) return [...responses];
  const due = responses
    .filter((r) => cardState(reviews.get(r.id), now) === 'due')
    .sort((a, b) => reviews.get(a.id)!.due - reviews.get(b.id)!.due);
  const fresh = responses
    .filter((r) => !reviews.has(r.id))
    .sort((a, b) => b.strength - a.strength || a.createdAt - b.createdAt)
    .slice(0, newLimit);
  return [...due, ...fresh];
}

/** Fisher–Yates shuffle with an injectable random source (for tests). */
export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
