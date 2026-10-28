import { firstSpeakingSide, roundSegments } from '../lib/speeches';
import { useApp } from '../store';
import type { Round, Side } from '../types';

const opposite = (s: Side): Side => (s === 'PRO' ? 'CON' : 'PRO');

export function useOpenRound() {
  const openRound = useApp((s) => s.openRound);
  const role = useApp((s) => s.role);
  return (r: Round) => {
    const first = roundSegments(firstSpeakingSide(r.ourSide, r.speakingOrder))[0];
    // Rebuttal speakers mostly answer the other team's case; constructive speakers live on their own.
    openRound(r.id, r.prepSeconds, role === 'CONSTRUCTIVE' ? r.ourSide : opposite(r.ourSide), first);
  };
}
