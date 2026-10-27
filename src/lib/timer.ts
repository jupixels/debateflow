export interface Clock {
  durationMs: number;
  elapsedMs: number;
  /** Epoch ms when the clock last started; null when paused. */
  startedAt: number | null;
}

export const makeClock = (durationMs: number): Clock => ({ durationMs, elapsedMs: 0, startedAt: null });

export const isRunning = (c: Clock) => c.startedAt !== null;

export function elapsed(c: Clock, now: number): number {
  return c.elapsedMs + (c.startedAt !== null ? now - c.startedAt : 0);
}

/** Remaining time; negative means overtime. */
export function remaining(c: Clock, now: number): number {
  return c.durationMs - elapsed(c, now);
}

export function start(c: Clock, now: number): Clock {
  return c.startedAt !== null ? c : { ...c, startedAt: now };
}

export function pause(c: Clock, now: number): Clock {
  return c.startedAt === null ? c : { ...c, elapsedMs: elapsed(c, now), startedAt: null };
}

export function toggle(c: Clock, now: number): Clock {
  return isRunning(c) ? pause(c, now) : start(c, now);
}

export function reset(c: Clock, durationMs = c.durationMs): Clock {
  return makeClock(durationMs);
}

/** Pause and pin to zero once a clock that can't run over (prep) is exhausted. */
export function clampAtZero(c: Clock, now: number): Clock {
  if (remaining(c, now) > 0) return c;
  return { durationMs: c.durationMs, elapsedMs: c.durationMs, startedAt: null };
}

export function formatMs(ms: number): string {
  const neg = ms < 0;
  const total = Math.ceil(Math.abs(ms) / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${neg ? '+' : ''}${m}:${s.toString().padStart(2, '0')}`;
}
