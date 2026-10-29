import { describe, expect, it } from 'vitest';
import type { BankResponse, Review } from '../types';
import { buildQueue, cardState, countDeck, formatInterval, rate, shuffle } from './flashcards';

const DAY = 86_400_000;
const NOW = 1_800_000_000_000;
const resp = (id: string, strength: 1 | 2 | 3 = 2, createdAt = 0): BankResponse => ({
  id,
  argumentId: 'a',
  kind: 'NU',
  isCard: false,
  tag: id,
  text: '',
  strength,
  timesUsed: 0,
  createdAt,
});

describe('rate', () => {
  it('moves a remembered card up and spaces it out', () => {
    const r1 = rate(undefined, 'x', 'good', NOW);
    expect(r1).toMatchObject({ id: 'x', box: 1, due: NOW + DAY, reps: 1, lapses: 0 });
    const r2 = rate(r1, 'x', 'good', NOW);
    expect(r2).toMatchObject({ box: 2, due: NOW + 3 * DAY, reps: 2 });
    expect(rate(r2, 'x', 'easy', NOW).box).toBe(4);
  });

  it('sends a forgotten card back to box 1 for a few minutes and counts the lapse', () => {
    const learned: Review = { id: 'x', box: 4, due: NOW, reviewedAt: 0, reps: 5, lapses: 0 };
    const r = rate(learned, 'x', 'again', NOW);
    expect(r).toMatchObject({ box: 1, lapses: 1 });
    expect(r.due - NOW).toBe(5 * 60_000);
  });

  it('keeps a hard card in its box with a shorter wait', () => {
    const prev: Review = { id: 'x', box: 3, due: NOW, reviewedAt: 0, reps: 3, lapses: 0 };
    const r = rate(prev, 'x', 'hard', NOW);
    expect(r.box).toBe(3);
    expect(r.due - NOW).toBe(3.5 * DAY);
  });
});

describe('queue', () => {
  const responses = [resp('new-weak', 1, 1), resp('new-strong', 3, 2), resp('due-late'), resp('due-early'), resp('later')];
  const reviews = new Map<string, Review>([
    ['due-late', { id: 'due-late', box: 2, due: NOW - 1000, reviewedAt: 0, reps: 2, lapses: 0 }],
    ['due-early', { id: 'due-early', box: 1, due: NOW - 5 * DAY, reviewedAt: 0, reps: 1, lapses: 0 }],
    ['later', { id: 'later', box: 4, due: NOW + DAY, reviewedAt: 0, reps: 4, lapses: 0 }],
  ]);

  it('puts the most overdue cards first, then new go-to responses', () => {
    expect(buildQueue(responses, reviews, NOW).map((r) => r.id)).toEqual(['due-early', 'due-late', 'new-strong', 'new-weak']);
    expect(buildQueue(responses, reviews, NOW, { newLimit: 1 }).map((r) => r.id)).toEqual(['due-early', 'due-late', 'new-strong']);
    expect(buildQueue(responses, reviews, NOW, { all: true })).toHaveLength(5);
  });

  it('counts deck states', () => {
    expect(countDeck(responses, reviews, NOW)).toEqual({ total: 5, new: 2, due: 2, learned: 1 });
    expect(cardState(reviews.get('later'), NOW)).toBe('learned');
  });
});

describe('helpers', () => {
  it('formats intervals', () => {
    expect(formatInterval(5 * 60_000)).toBe('5m');
    expect(formatInterval(3 * 3_600_000)).toBe('3h');
    expect(formatInterval(3 * DAY)).toBe('3d');
    expect(formatInterval(60 * DAY)).toBe('2mo');
  });

  it('shuffles without losing cards', () => {
    let seed = 1;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const out = shuffle([1, 2, 3, 4, 5], rnd);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
