/** Words in a block of text (cites and card text count like anything else you read aloud). */
export function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export const secondsFor = (words: number, wpm: number) => (wpm > 0 ? (words / wpm) * 60 : 0);

export interface TimedBlock {
  id: string;
  words: number;
  /** Planned start, in seconds from the start of the speech. */
  start: number;
  seconds: number;
}

/** Lay out blocks back to back at a speaking speed. */
export function timeline(blocks: { id: string; text: string }[], wpm: number): { blocks: TimedBlock[]; total: number } {
  let t = 0;
  const out = blocks.map((b) => {
    const words = wordCount(b.text);
    const seconds = secondsFor(words, wpm);
    const block = { id: b.id, words, start: t, seconds };
    t += seconds;
    return block;
  });
  return { blocks: out, total: t };
}

/** m:ss for a number of seconds. */
export function clock(seconds: number): string {
  const s = Math.round(Math.abs(seconds));
  return `${seconds < 0 ? '-' : ''}${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
