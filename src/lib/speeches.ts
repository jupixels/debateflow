import type { ResponseKind, Side, Speech } from '../types';

export const speechSide = (s: Speech): Side => (s.startsWith('P') ? 'PRO' : 'CON');

/** Flow columns in speaking order for the team that speaks first. */
export function flowColumns(firstSide: Side): Speech[] {
  return firstSide === 'PRO'
    ? ['PC', 'CC', 'PR', 'CR', 'PS', 'CS', 'PFF', 'CFF']
    : ['CC', 'PC', 'CR', 'PR', 'CS', 'PS', 'CFF', 'PFF'];
}

export const firstSpeakingSide = (ourSide: Side, speakingOrder: 1 | 2): Side =>
  speakingOrder === 1 ? ourSide : ourSide === 'PRO' ? 'CON' : 'PRO';

export interface TimedSegment {
  id: string;
  label: string;
  seconds: number;
  speech?: Speech;
}

/** Every timed segment of a PF round, in order. */
export function roundSegments(firstSide: Side): TimedSegment[] {
  const cols = flowColumns(firstSide);
  const seg = (speech: Speech, seconds: number): TimedSegment => ({
    id: speech,
    label: speech,
    seconds,
    speech,
  });
  return [
    seg(cols[0], 240),
    seg(cols[1], 240),
    { id: 'CF1', label: 'Crossfire', seconds: 180 },
    seg(cols[2], 240),
    seg(cols[3], 240),
    { id: 'CF2', label: 'Crossfire 2', seconds: 180 },
    seg(cols[4], 180),
    seg(cols[5], 180),
    { id: 'GCF', label: 'Grand CX', seconds: 180 },
    seg(cols[6], 120),
    seg(cols[7], 120),
  ];
}

/** Alt+1…6 tag shortcuts (by physical key, so they work on macOS too). */
export const KIND_SHORTCUTS: Record<string, ResponseKind> = {
  Digit1: 'NU',
  Digit2: 'DELINK',
  Digit3: 'LINK_TURN',
  Digit4: 'IMPACT_TURN',
  Digit5: 'MITIGATION',
  Digit6: 'WEIGHING',
};

const other = (s: Side): Side => (s === 'PRO' ? 'CON' : 'PRO');
const rebuttalOf = (s: Side): Speech => (s === 'PRO' ? 'PR' : 'CR');
const constructiveOf = (s: Side): Speech => (s === 'PRO' ? 'PC' : 'CC');

/**
 * Columns that are normally empty on a sheet, hidden until you show them:
 * - the other team's constructive (it's on the other sheet);
 * - the first-speaking team's rebuttal on that team's own case sheet, because
 *   the first rebuttal only attacks; frontlining starts with the second rebuttal.
 */
export function defaultHiddenColumns(sheet: Side, firstSide: Side): Speech[] {
  const hidden: Speech[] = [constructiveOf(other(sheet))];
  if (sheet === firstSide) hidden.push(rebuttalOf(firstSide));
  return hidden;
}

export function hiddenColumns(
  hiddenCols: Partial<Record<Side, Speech[]>> | undefined,
  sheet: Side,
  firstSide: Side,
): Speech[] {
  return hiddenCols?.[sheet] ?? defaultHiddenColumns(sheet, firstSide);
}
