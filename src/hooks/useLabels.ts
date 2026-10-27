import { sideName, speechCode, speechName } from '../lib/labels';
import { useApp } from '../store';
import type { Side, Speech } from '../types';

/** Side and speech names in the user's chosen wording (Pro/Con or Aff/Neg). */
export function useLabels() {
  const mode = useApp((s) => s.sideLabels);
  return {
    side: (s: Side) => sideName(s, mode),
    speech: (s: Speech) => speechCode(s, mode),
    speechName: (s: Speech) => speechName(s, mode),
  };
}
