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
