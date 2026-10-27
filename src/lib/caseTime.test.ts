import { describe, expect, it } from 'vitest';
import { clock, secondsFor, timeline, wordCount } from './caseTime';

describe('case timing', () => {
  it('counts words', () => {
    expect(wordCount('')).toBe(0);
    expect(wordCount('  one two\nthree  ')).toBe(3);
  });

  it('turns words into seconds at a speaking speed', () => {
    expect(secondsFor(220, 220)).toBe(60);
    expect(secondsFor(110, 220)).toBe(30);
  });

  it('lays blocks out back to back', () => {
    const t = timeline(
      [
        { id: 'a', text: 'word '.repeat(110) },
        { id: 'b', text: 'word '.repeat(220) },
      ],
      220,
    );
    expect(t.blocks.map((b) => [b.id, b.start, b.seconds])).toEqual([
      ['a', 0, 30],
      ['b', 30, 60],
    ]);
    expect(t.total).toBe(90);
  });

  it('formats', () => {
    expect(clock(0)).toBe('0:00');
    expect(clock(75.4)).toBe('1:15');
    expect(clock(-8)).toBe('-0:08');
  });
});
