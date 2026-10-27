import { describe, expect, it } from 'vitest';
import { clampAtZero, formatMs, isRunning, makeClock, pause, remaining, reset, start, toggle } from './timer';

describe('clock', () => {
  it('counts down only while running', () => {
    let c = makeClock(60_000);
    expect(remaining(c, 1000)).toBe(60_000);
    c = start(c, 1000);
    expect(remaining(c, 11_000)).toBe(50_000);
    c = pause(c, 11_000);
    expect(remaining(c, 99_000)).toBe(50_000);
    c = toggle(c, 100_000);
    expect(isRunning(c)).toBe(true);
    expect(remaining(c, 105_000)).toBe(45_000);
  });

  it('never shows more time than it started with when read with an older timestamp', () => {
    const c = start(makeClock(240_000), 10_000);
    expect(remaining(c, 5_000)).toBe(240_000);
  });

  it('goes negative for overtime and resets', () => {
    const c = start(makeClock(1000), 0);
    expect(remaining(c, 3000)).toBe(-2000);
    expect(remaining(reset(c), 5000)).toBe(1000);
  });

  it('clamps exhausted prep to zero and stops it', () => {
    const c = clampAtZero(start(makeClock(1000), 0), 2000);
    expect(isRunning(c)).toBe(false);
    expect(remaining(c, 9999)).toBe(0);
    const live = start(makeClock(1000), 0);
    expect(clampAtZero(live, 500)).toBe(live);
  });

  it('formats', () => {
    expect(formatMs(240_000)).toBe('4:00');
    expect(formatMs(59_001)).toBe('1:00');
    expect(formatMs(5_000)).toBe('0:05');
    expect(formatMs(-12_000)).toBe('+0:12');
  });
});
