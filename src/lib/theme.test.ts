import { describe, expect, it } from 'vitest';
import { MAX_CHROMA, accentToWheel, wheelToAccent } from './theme';

describe('color wheel mapping', () => {
  it('puts hue 0 at the top and increases clockwise', () => {
    expect(wheelToAccent(0, -1).h).toBe(0);
    expect(wheelToAccent(1, 0).h).toBe(90);
    expect(wheelToAccent(0, 1).h).toBe(180);
    expect(wheelToAccent(-1, 0).h).toBe(270);
  });

  it('maps distance from center to chroma, clamped at the rim', () => {
    expect(wheelToAccent(0, 0).c).toBe(0);
    expect(wheelToAccent(0.5, 0).c).toBeCloseTo(MAX_CHROMA / 2, 3);
    expect(wheelToAccent(3, 0).c).toBeCloseTo(MAX_CHROMA, 3);
  });

  it('round-trips', () => {
    const a = { h: 137, c: 0.11 };
    const { x, y } = accentToWheel(a);
    const back = wheelToAccent(x, y);
    expect(back.h).toBe(137);
    expect(back.c).toBeCloseTo(0.11, 3);
  });
});
