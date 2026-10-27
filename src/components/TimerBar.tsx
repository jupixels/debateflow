import { MessagesSquare, Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import { useTicker } from '../hooks/useTicker';
import { formatMs, isRunning, remaining } from '../lib/timer';
import { type TimedSegment, speechSide } from '../lib/speeches';
import { useLabels } from '../hooks/useLabels';
import { useApp } from '../store';
import type { Round, Side } from '../types';

export function TimerBar({ round, segments }: { round: Round; segments: TimedSegment[] }) {
  const { timers, selectSegment, toggleSpeech, resetSpeech, togglePrep, resetPrep, tickPrep } = useApp();
  const running = isRunning(timers.speech) || isRunning(timers.prep.PRO) || isRunning(timers.prep.CON);
  useTicker(running, 200, tickPrep);
  const label = useLabels();
  const now = Date.now();

  const current = segments.findIndex((s) => s.id === timers.segmentId);
  const seg = segments[current];
  const left = remaining(timers.speech, now);
  const total = timers.speech.durationMs || 1;
  const progress = Math.min(1, Math.max(0, 1 - left / total));
  const theirSide: Side = round.ourSide === 'PRO' ? 'CON' : 'PRO';
  const tone = left < 0 ? 'text-danger' : left <= 15_000 && timers.speech.durationMs > 0 ? 'text-warn' : '';

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line bg-surface px-3 py-2 sm:px-4">
      <ol className="flex min-w-0 items-center gap-1 overflow-x-auto py-0.5" aria-label="Round order">
        {segments.map((s, i) => {
          const cx = !s.speech;
          const ours = s.speech && speechSide(s.speech) === round.ourSide;
          const active = s.id === timers.segmentId;
          return (
            <li key={s.id}>
              <button
                onClick={() => selectSegment(s.id, s.seconds)}
                title={`${s.speech ? label.speechName(s.speech) : s.label} · ${s.seconds / 60} min`}
                aria-current={active ? 'step' : undefined}
                className={`relative flex h-7 items-center gap-1 rounded-md px-2 font-mono text-[0.7rem] font-semibold whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-accent text-accent-ink shadow-card'
                    : i < current
                      ? 'text-faint hover:bg-surface-3'
                      : ours
                        ? 'bg-accent-soft text-accent-text hover:bg-accent-soft/80'
                        : 'bg-surface-2 text-muted hover:bg-surface-3 hover:text-fg'
                }`}
              >
                {cx && <MessagesSquare size={11} />}
                {s.speech ? label.speech(s.speech) : s.id}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="flex items-center gap-3">
        <div className="min-w-[6.5rem]">
          <div className="flex items-baseline gap-2">
            <span className={`font-mono text-[1.65rem] leading-none font-semibold tabular-nums ${tone}`} aria-label="Speech time remaining" aria-live="off">
              {formatMs(left)}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
              <div
                className={`h-full rounded-full transition-[width] duration-200 ${left < 0 ? 'bg-danger' : left <= 15_000 ? 'bg-warn' : 'bg-accent'}`}
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
          <div className="mt-1 truncate text-[0.68rem] text-faint">{seg ? (seg.speech ? label.speechName(seg.speech) : seg.label) : ''}</div>
        </div>
        <div className="flex items-center gap-1">
          <button className="btn btn-primary btn-icon size-9 rounded-full" onClick={toggleSpeech} title="Start / pause (Space)" aria-label={isRunning(timers.speech) ? 'Pause' : 'Start'}>
            {isRunning(timers.speech) ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
          </button>
          <button className="btn btn-ghost btn-icon" onClick={resetSpeech} title="Reset" aria-label="Reset speech timer">
            <RotateCcw size={15} />
          </button>
          <button
            className="btn btn-ghost btn-icon"
            disabled={current < 0 || current >= segments.length - 1}
            onClick={() => selectSegment(segments[current + 1].id, segments[current + 1].seconds)}
            title="Next speech (N)"
            aria-label="Next speech"
          >
            <SkipForward size={15} />
          </button>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {([round.ourSide, theirSide] as Side[]).map((side) => {
          const clock = timers.prep[side];
          const prepLeft = Math.max(0, remaining(clock, now));
          const on = isRunning(clock);
          const ours = side === round.ourSide;
          return (
            <div
              key={side}
              className={`flex items-center gap-1 rounded-lg border py-1 pr-1 pl-2.5 transition-colors ${
                on ? 'border-warn bg-warn/10' : 'border-line bg-surface-2'
              }`}
            >
              <button onClick={() => togglePrep(side)} title={ours ? 'P' : 'Shift+P'} className="flex items-center gap-2 text-left">
                <span className="text-[0.68rem] leading-tight font-medium text-muted">
                  {ours ? 'Our' : 'Their'}
                  <br />
                  prep
                </span>
                <span className={`font-mono text-base font-semibold tabular-nums ${prepLeft === 0 ? 'text-danger' : on ? 'text-warn' : ''}`}>
                  {formatMs(prepLeft)}
                </span>
                {on ? <Pause size={12} className="text-warn" /> : <Play size={12} className="text-faint" />}
              </button>
              <button
                className="btn btn-ghost btn-sm btn-icon text-faint"
                onClick={() => resetPrep(side, round.prepSeconds)}
                aria-label={`Reset ${ours ? 'our' : 'their'} prep`}
                title="Reset prep"
              >
                <RotateCcw size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
