import { describe, expect, it } from 'vitest';
import { shouldAutoUpdate } from './update';

describe('shouldAutoUpdate', () => {
  it('updates silently right after opening', () => {
    expect(shouldAutoUpdate(3_000, false)).toBe(true);
  });

  it('asks once the app has been in use or a clock is running', () => {
    expect(shouldAutoUpdate(60_000, false)).toBe(false);
    expect(shouldAutoUpdate(3_000, true)).toBe(false);
  });
});
