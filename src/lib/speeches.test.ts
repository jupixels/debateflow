import { describe, expect, it } from 'vitest';
import { defaultHiddenColumns, firstSpeakingSide, flowColumns, hiddenColumns, roundSegments } from './speeches';

describe('speeches', () => {
  it('orders columns by who speaks first', () => {
    expect(flowColumns('PRO')).toEqual(['PC', 'CC', 'PR', 'CR', 'PS', 'CS', 'PFF', 'CFF']);
    expect(flowColumns('CON')).toEqual(['CC', 'PC', 'CR', 'PR', 'CS', 'PS', 'CFF', 'PFF']);
  });

  it('works out the first speaking side', () => {
    expect(firstSpeakingSide('PRO', 1)).toBe('PRO');
    expect(firstSpeakingSide('PRO', 2)).toBe('CON');
    expect(firstSpeakingSide('CON', 2)).toBe('PRO');
  });

  it('uses PF speech times (4/4/3/3/2 with 3-minute crossfires)', () => {
    const segs = roundSegments('CON');
    expect(segs.map((s) => `${s.id}:${s.seconds}`)).toEqual([
      'CC:240', 'PC:240', 'CF1:180', 'CR:240', 'PR:240', 'CF2:180',
      'CS:180', 'PS:180', 'GCF:180', 'CFF:120', 'PFF:120',
    ]);
  });
});

describe('default hidden columns', () => {
  it('hides the other constructive on each sheet', () => {
    expect(defaultHiddenColumns('CON', 'CON')).toContain('PC');
    expect(defaultHiddenColumns('PRO', 'CON')).toContain('CC');
  });

  it('hides the first rebuttal on the first speaker’s own sheet only', () => {
    // Con speaks first: CR only attacks the Pro case, so it is hidden on the Con sheet.
    expect(defaultHiddenColumns('CON', 'CON')).toEqual(['PC', 'CR']);
    // PR (second rebuttal) answers the Con case and frontlines, so both sheets keep it.
    expect(defaultHiddenColumns('PRO', 'CON')).toEqual(['CC']);
    expect(defaultHiddenColumns('PRO', 'PRO')).toEqual(['CC', 'PR']);
  });

  it('uses saved choices over defaults', () => {
    expect(hiddenColumns({ PRO: [] }, 'PRO', 'PRO')).toEqual([]);
    expect(hiddenColumns({ PRO: [] }, 'CON', 'PRO')).toEqual(['PC']);
    expect(hiddenColumns(undefined, 'CON', 'PRO')).toEqual(['PC']);
  });
});
