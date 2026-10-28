import { describe, expect, it } from 'vitest';
import type { FlowCell, FlowRow, Round } from '../types';
import { analyzeFlow, buildOutline, collapseAdvice, outlineText } from './summary';

const round = { id: 'r', ourSide: 'PRO', speakingOrder: 2 } as Round;
const row = (id: string, sheet: 'PRO' | 'CON', order: number, plan?: 'go' | 'drop'): FlowRow => ({ id, roundId: 'r', sheet, order, plan });
const cell = (rowId: string, speech: FlowCell['speech'], text: string): FlowCell => ({ id: `${rowId}${speech}`, roundId: 'r', rowId, speech, text, linkedResponseIds: [] });

const rows = [row('o1', 'PRO', 0), row('o2', 'PRO', 1), row('o3', 'PRO', 2, 'drop'), row('t1', 'CON', 0), row('t2', 'CON', 1), row('empty', 'CON', 2)];
const cells = [
  cell('o1', 'PC', 'C1: Jobs\nlong warrant'),
  cell('o1', 'CR', 'NU: trend exists'),
  cell('o1', 'PR', 'Trend is slowing'),
  cell('o2', 'PC', 'C2: Health'),
  cell('o2', 'CR', 'Delink'),
  cell('o3', 'PC', 'C3: Ocean'),
  cell('t1', 'CC', 'C1: Costs'),
  cell('t1', 'PR', 'Costs fall over time'),
  cell('t2', 'CC', 'C2: Trade'),
];

describe('summary builder', () => {
  const { ours, theirs } = analyzeFlow(round, rows, cells, []);

  it('works out coverage on both sheets and skips empty rows', () => {
    expect(ours.map((i) => [i.title, i.status, i.plan])).toEqual([
      ['C1: Jobs', 'frontlined', 'go'],
      ['C2: Health', 'needs-frontline', 'go'],
      ['C3: Ocean', 'clean', 'drop'],
    ]);
    expect(theirs.map((i) => [i.title, i.status])).toEqual([
      ['C1: Costs', 'answered'],
      ['C2: Trade', 'unanswered'],
    ]);
  });

  it('builds an outline of extensions, responses and weighing, leaving out dropped arguments', () => {
    const text = outlineText(buildOutline(ours, theirs, 'Scope: global'));
    expect(text).toContain('EXTEND: C1: JOBS\nTrend is slowing');
    expect(text).toContain('Frontline needed. They said:\nDelink');
    expect(text).not.toContain('Ocean');
    expect(text).toContain('THEIR C2: TRADE\nNot answered yet.');
    expect(text.endsWith('WEIGHING\nScope: global')).toBe(true);
  });

  it('advises collapsing', () => {
    expect(collapseAdvice(2, 'FLOW', 'summary')).toBeNull();
    expect(collapseAdvice(2, 'LAY', 'summary')).toMatch(/one/);
    expect(collapseAdvice(2, 'TECH', 'ff')).toMatch(/Final focus/);
    expect(collapseAdvice(0, 'TECH', 'summary')).toMatch(/at least one/);
  });
});
