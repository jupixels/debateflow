import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type Clock, clampAtZero, makeClock, pause, reset, toggle } from './lib/timer';
import type { Side } from './types';

export type View = 'bank' | 'rounds' | 'flow';

interface TimerState {
  /** Round the timers belong to; opening another round resets them. */
  roundId: string | null;
  segmentId: string;
  speech: Clock;
  prep: Record<Side, Clock>;
}

interface AppState {
  view: View;
  theme: 'dark' | 'light';
  resolutionId: string | null;
  argumentId: string | null;
  roundId: string | null;
  sheet: Side | null;
  timers: TimerState;

  setView: (v: View) => void;
  toggleTheme: () => void;
  selectResolution: (id: string | null) => void;
  selectArgument: (id: string | null) => void;
  openRound: (id: string, prepSeconds: number, defaultSheet: Side, firstSegment: { id: string; seconds: number }) => void;
  setSheet: (s: Side) => void;

  selectSegment: (id: string, seconds: number) => void;
  toggleSpeech: () => void;
  resetSpeech: () => void;
  togglePrep: (side: Side) => void;
  resetPrep: (side: Side, seconds: number) => void;
  /** Called on each timer tick to stop exhausted prep clocks. */
  tickPrep: (now: number) => void;
}

const emptyTimers: TimerState = {
  roundId: null,
  segmentId: '',
  speech: makeClock(0),
  prep: { PRO: makeClock(180_000), CON: makeClock(180_000) },
};

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      view: 'bank',
      theme: 'dark',
      resolutionId: null,
      argumentId: null,
      roundId: null,
      sheet: null,
      timers: emptyTimers,

      setView: (view) => set({ view }),
      toggleTheme: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
      selectResolution: (resolutionId) => set({ resolutionId, argumentId: null }),
      selectArgument: (argumentId) => set({ argumentId }),
      openRound: (roundId, prepSeconds, defaultSheet, firstSegment) => {
        const same = get().timers.roundId === roundId;
        set({
          roundId,
          view: 'flow',
          sheet: same ? (get().sheet ?? defaultSheet) : defaultSheet,
          timers: same
            ? get().timers
            : {
                roundId,
                segmentId: firstSegment.id,
                speech: makeClock(firstSegment.seconds * 1000),
                prep: { PRO: makeClock(prepSeconds * 1000), CON: makeClock(prepSeconds * 1000) },
              },
        });
      },
      setSheet: (sheet) => set({ sheet }),

      selectSegment: (segmentId, seconds) =>
        set((s) => ({ timers: { ...s.timers, segmentId, speech: makeClock(seconds * 1000) } })),
      toggleSpeech: () => set((s) => ({ timers: { ...s.timers, speech: toggle(s.timers.speech, Date.now()) } })),
      resetSpeech: () => set((s) => ({ timers: { ...s.timers, speech: reset(s.timers.speech) } })),
      togglePrep: (side) =>
        set((s) => {
          const now = Date.now();
          const other: Side = side === 'PRO' ? 'CON' : 'PRO';
          return {
            timers: {
              ...s.timers,
              // Only one team preps at a time.
              prep: { ...s.timers.prep, [side]: toggle(s.timers.prep[side], now), [other]: pause(s.timers.prep[other], now) } as Record<Side, Clock>,
            },
          };
        }),
      resetPrep: (side, seconds) =>
        set((s) => ({ timers: { ...s.timers, prep: { ...s.timers.prep, [side]: makeClock(seconds * 1000) } } })),
      tickPrep: (now) => {
        const { prep } = get().timers;
        const PRO = clampAtZero(prep.PRO, now);
        const CON = clampAtZero(prep.CON, now);
        if (PRO !== prep.PRO || CON !== prep.CON) set((s) => ({ timers: { ...s.timers, prep: { PRO, CON } } }));
      },
    }),
    { name: 'rebuttal-flow-ui' },
  ),
);
