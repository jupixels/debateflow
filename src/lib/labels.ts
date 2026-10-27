import type { Side, Speech } from '../types';

/** How sides are named on screen. Stored data always uses PRO/CON. */
export type SideLabels = 'procon' | 'affneg';

const SIDE_NAMES: Record<SideLabels, Record<Side, string>> = {
  procon: { PRO: 'Pro', CON: 'Con' },
  affneg: { PRO: 'Aff', CON: 'Neg' },
};

const SPEECH_PARTS: Record<Speech, [Side, string]> = {
  PC: ['PRO', 'Constructive'],
  CC: ['CON', 'Constructive'],
  PR: ['PRO', 'Rebuttal'],
  CR: ['CON', 'Rebuttal'],
  PS: ['PRO', 'Summary'],
  CS: ['CON', 'Summary'],
  PFF: ['PRO', 'Final Focus'],
  CFF: ['CON', 'Final Focus'],
};

export const sideName = (side: Side, mode: SideLabels) => SIDE_NAMES[mode][side];

/** Short column code, e.g. PC / AC, PFF / AFF. */
export function speechCode(speech: Speech, mode: SideLabels): string {
  if (mode === 'procon') return speech;
  return (speech[0] === 'P' ? 'A' : 'N') + speech.slice(1);
}

export function speechName(speech: Speech, mode: SideLabels): string {
  const [side, part] = SPEECH_PARTS[speech];
  return `${sideName(side, mode)} ${part}`;
}
