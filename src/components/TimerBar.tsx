import { useEffect, useState } from 'react';
import { formatMs, isRunning, remaining } from '../lib/timer';
import type { TimedSegment } from '../lib/speeches';
import { useApp } from '../store';
import type { Round, Side } from '../types';

export function TimerBar({ round, segments }: { round: Round; segments: TimedSegment[] }) {
  const { timers, selectSegment, toggleSpeech, resetSpeech, togglePrep, resetPrep, tickPrep } = useApp();
  const [now, setNow] = useState(() => Date.now());

  const anyRunning = isRunning(timers.speech) || isRunning(timers.prep.PRO) || isRunning(timers.prep.CON);
  useEffect(() => {
    if (!anyRunning) return;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      tickPrep(n);
    }, 200);
    return () => clearInterval(t);
  }, [anyRunning, tickPrep]);

  const current = segments.findIndex((s) => s.id === timers.segmentId);
  const speechLeft = remaining(timers.speech, now);
  const ours = (s: TimedSegment) => s.speech && (s.speech.startsWith('P') ? 'PRO' : 'CON') === round.ourSide;
  const theirSide: Side = round.ourSide === 'PRO' ? 'CON' : 'PRO';

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap gap-1" role="group" aria-label="Speech">
        {segments.map((s, i) => (
          <button
            key={s.id}
            onClick={() => selectSegment(s.id, s.seconds)}
            title={`${s.label} · ${s.seconds / 60} min`}
            className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
              s.id === timers.segmentId
                ? 'bg-sky-600 text-white'
                : i < current
                  ? 'text-slate-400 line-through decoration-1'
                  : ours(s)
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-slate-100 dark:bg-slate-800'
            }`}
          >
            {s.speech ?? s.id}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`min-w-[4.5rem] text-center font-mono text-2xl font-bold tabular-nums ${
            speechLeft < 0 ? 'text-rose-500' : speechLeft <= 15_000 ? 'text-amber-500' : ''
          }`}
          aria-label="Speech time remaining"
        >
          {formatMs(speechLeft)}
        </span>
        <button className="btn btn-primary" onClick={toggleSpeech} title="Space">
          {isRunning(timers.speech) ? 'Pause' : 'Start'}
        </button>
        <button className="btn" onClick={resetSpeech}>
          Reset
        </button>
        {current >= 0 && current < segments.length - 1 && (
          <button
            className="btn"
            onClick={() => selectSegment(segments[current + 1].id, segments[current + 1].seconds)}
            title="Next speech"
          >
            Next →
          </button>
        )}
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-3">
        {([round.ourSide, theirSide] as Side[]).map((side) => {
          const clock = timers.prep[side];
          const left = remaining(clock, now);
          return (
            <div key={side} className="flex items-center gap-1">
              <span className="text-xs font-semibold text-slate-500">
                {side === round.ourSide ? 'Our prep' : 'Their prep'}
              </span>
              <button
                onClick={() => togglePrep(side)}
                title={side === round.ourSide ? 'P' : 'Shift+P'}
                className={`rounded px-2 py-0.5 font-mono text-sm font-bold tabular-nums ${
                  isRunning(clock)
                    ? 'bg-amber-500 text-white'
                    : left <= 0
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                      : 'bg-slate-100 dark:bg-slate-800'
                }`}
              >
                {formatMs(Math.max(0, left))}
              </button>
              <button
                className="text-xs text-slate-400 hover:text-slate-600"
                onClick={() => resetPrep(side, round.prepSeconds)}
                aria-label={`Reset ${side} prep`}
              >
                ↺
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
