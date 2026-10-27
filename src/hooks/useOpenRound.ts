import { firstSpeakingSide, roundSegments } from '../lib/speeches';
import { useApp } from '../store';
import type { Round, Side } from '../types';

const opposite = (s: Side): Side => (s === 'PRO' ? 'CON' : 'PRO');

export function useOpenRound() {
  const openRound = useApp((s) => s.openRound);
  return (r: Round) => {
    const first = roundSegments(firstSpeakingSide(r.ourSide, r.speakingOrder))[0];
    // Rebuttal speakers mostly answer the other team's case, so open their sheet.
    openRound(r.id, r.prepSeconds, opposite(r.ourSide), first);
  };
}
