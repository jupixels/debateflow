import type { Argument, FlowCell, FlowRow, JudgeType, Round, Side, Speech } from '../types';
import { wordCount } from './caseTime';

const code = (side: Side, part: 'C' | 'R' | 'S' | 'FF'): Speech => `${side === 'PRO' ? 'P' : 'C'}${part}` as Speech;
const other = (s: Side): Side => (s === 'PRO' ? 'CON' : 'PRO');
const joinText = (...parts: (string | undefined)[]) => parts.map((p) => p?.trim()).filter(Boolean).join('\n');
const firstLine = (s?: string) => s?.trim().split('\n')[0]?.trim() ?? '';

export interface SummaryItem {
  rowId: string;
  sheet: Side;
  title: string;
  plan: 'go' | 'drop';
  /** What the other team said about this argument. */
  against: string;
  /** What we have said for it (frontlines on our case, responses on theirs). */
  ours: string;
  status: 'clean' | 'frontlined' | 'needs-frontline' | 'answered' | 'unanswered';
}

/**
 * Read both sheets and work out, for each argument, what each team has said.
 * Our case: their rebuttal/summary attacks it; our rebuttal/summary frontlines it.
 * Their case: our rebuttal/summary answers it.
 */
export function analyzeFlow(round: Round, rows: FlowRow[], cells: FlowCell[], args: Argument[]): { ours: SummaryItem[]; theirs: SummaryItem[] } {
  const text = new Map(cells.map((c) => [`${c.rowId}:${c.speech}`, c.text]));
  const at = (rowId: string, s: Speech) => text.get(`${rowId}:${s}`) ?? '';
  const argTitle = new Map(args.map((a) => [a.id, a.title]));
  const us = round.ourSide;
  const them = other(us);

  const items = (sheet: Side) =>
    rows
      .filter((r) => r.sheet === sheet)
      .sort((a, b) => a.order - b.order)
      .map((r, i): SummaryItem | null => {
        const ourWords = joinText(at(r.id, code(us, 'R')), at(r.id, code(us, 'S')));
        const theirWords = joinText(at(r.id, code(them, 'R')), at(r.id, code(them, 'S')));
        const constructive = at(r.id, code(sheet, 'C'));
        if (!constructive.trim() && !ourWords && !theirWords) return null;
        const title = firstLine(constructive) || (r.argumentId && argTitle.get(r.argumentId)) || `Argument ${i + 1}`;
        const status: SummaryItem['status'] =
          sheet === us ? (!theirWords ? 'clean' : ourWords ? 'frontlined' : 'needs-frontline') : ourWords ? 'answered' : 'unanswered';
        return { rowId: r.id, sheet, title, plan: r.plan ?? 'go', against: theirWords, ours: ourWords, status };
      })
      .filter((x): x is SummaryItem => !!x);

  return { ours: items(us), theirs: items(them) };
}

export interface OutlineBlock {
  id: string;
  title: string;
  body: string;
}

/** Turn the plan into an ordered speech outline: extensions, then responses, then weighing. */
export function buildOutline(ours: SummaryItem[], theirs: SummaryItem[], weighing: string): OutlineBlock[] {
  const blocks: OutlineBlock[] = [];
  for (const it of ours.filter((x) => x.plan === 'go')) {
    const body =
      it.status === 'needs-frontline'
        ? `Frontline needed. They said:\n${it.against}`
        : joinText(it.ours, it.status === 'clean' ? 'Conceded: they never answered this. Extend the warrant and impact.' : undefined);
    blocks.push({ id: it.rowId, title: `Extend: ${it.title}`, body });
  }
  for (const it of theirs.filter((x) => x.plan === 'go')) {
    blocks.push({ id: it.rowId, title: `Their ${it.title}`, body: it.ours || 'Not answered yet.' });
  }
  if (weighing.trim()) blocks.push({ id: 'weighing', title: 'Weighing', body: weighing.trim() });
  return blocks;
}

export const outlineText = (blocks: OutlineBlock[]) => blocks.map((b) => `${b.title.toUpperCase()}\n${b.body}`).join('\n\n');

export const outlineWords = (blocks: OutlineBlock[]) => blocks.reduce((n, b) => n + wordCount(`${b.title} ${b.body}`), 0);

/** Advice on how much to go for, based on the judge. */
export function collapseAdvice(extending: number, judge: JudgeType, speech: 'summary' | 'ff'): string | null {
  const max = judge === 'LAY' || speech === 'ff' ? 1 : 2;
  if (extending > max) {
    return `You’re extending ${extending} of your arguments. ${judge === 'LAY' ? 'Lay judges' : speech === 'ff' ? 'Final focus' : 'Most summaries'} usually go for ${max === 1 ? 'one' : 'one or two'}: drop the weakest.`;
  }
  if (extending === 0) return 'You aren’t extending any of your own arguments, so you can’t win offense. Pick at least one.';
  return null;
}
