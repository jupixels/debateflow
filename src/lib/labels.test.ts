import { describe, expect, it } from 'vitest';
import { sideName, speechCode, speechName } from './labels';

describe('side labels', () => {
  it('uses Pro/Con by default', () => {
    expect(sideName('PRO', 'procon')).toBe('Pro');
    expect(speechCode('CFF', 'procon')).toBe('CFF');
    expect(speechName('CS', 'procon')).toBe('Con Summary');
  });

  it('switches to Aff/Neg', () => {
    expect(sideName('CON', 'affneg')).toBe('Neg');
    expect(speechCode('PC', 'affneg')).toBe('AC');
    expect(speechCode('CFF', 'affneg')).toBe('NFF');
    expect(speechName('PFF', 'affneg')).toBe('Aff Final Focus');
  });
});
