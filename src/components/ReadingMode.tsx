import { Minus, Pause, Play, Plus, RotateCcw, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTicker } from '../hooks/useTicker';
import { clock, timeline } from '../lib/caseTime';
import { elapsed, isRunning, makeClock, reset, toggle } from '../lib/timer';
import { useApp } from '../store';

export interface ReadingBlock {
  id: string;
  title: string;
  body: string;
}

/**
 * Full-screen speech view: big text, a speech clock, and where you should be.
 * Tap a section (or use ↑/↓) to mark where you are; the pace shows if you're ahead or behind.
 */
export function ReadingMode({ title, blocks, targetSeconds, onClose }: { title: string; blocks: ReadingBlock[]; targetSeconds: number; onClose: () => void }) {
  const { wpm, readingFontSize, setReadingFontSize } = useApp();
  const [timerClock, setClock] = useState(() => makeClock(targetSeconds * 1000));
  const [here, setHere] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);
  useTicker(isRunning(timerClock), 250);

  const plan = useMemo(() => timeline(blocks.map((b) => ({ id: b.id, text: `${b.title} ${b.body}` })), wpm), [blocks, wpm]);
  const spent = elapsed(timerClock, Date.now()) / 1000;
  const left = targetSeconds - spent;
  // Section you should be reading by now, by the plan.
  const due = plan.blocks.reduce((last, b, i) => (b.start <= spent ? i : last), -1);
  const pace = spent - (plan.blocks[here]?.start ?? 0);
  const started = spent > 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.code === 'Space') {
        e.preventDefault();
        setClock((c) => toggle(c, Date.now()));
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setHere((h) => Math.max(0, Math.min(blocks.length - 1, h + (e.key === 'ArrowDown' ? 1 : -1))));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [blocks.length, onClose]);

  useEffect(() => {
    refs.current[here]?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [here]);

  return (
    <div className="animate-fade fixed inset-0 z-[55] flex flex-col bg-bg" role="dialog" aria-label={`Reading ${title}`}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-surface px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{title}</div>
          <div className="text-xs text-muted">
            Planned {clock(plan.total)} of {clock(targetSeconds)} at {wpm} wpm
          </div>
        </div>
        {started && (
          <span
            className={`rounded-md px-2 py-1 text-xs font-semibold ${
              Math.abs(pace) < 5 ? 'bg-ok/15 text-ok' : pace > 0 ? 'bg-warn/15 text-warn' : 'bg-accent-soft text-accent-text'
            }`}
            title="Compared with the planned start of the section you marked"
          >
            {Math.abs(pace) < 5 ? 'On pace' : pace > 0 ? `${clock(pace)} behind` : `${clock(-pace)} ahead`}
          </span>
        )}
        <span className={`font-mono text-3xl font-semibold tabular-nums ${left < 0 ? 'text-danger' : left < 15 ? 'text-warn' : ''}`}>
          {left < 0 ? '+' : ''}
          {clock(Math.abs(left))}
        </span>
        <div className="flex items-center gap-1">
          <button className="btn btn-primary btn-icon size-9 rounded-full" onClick={() => setClock((c) => toggle(c, Date.now()))} aria-label={isRunning(timerClock) ? 'Pause' : 'Start'} title="Space">
            {isRunning(timerClock) ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
          </button>
          <button className="btn btn-ghost btn-icon" onClick={() => setClock((c) => reset(c))} aria-label="Reset timer">
            <RotateCcw size={15} />
          </button>
        </div>
        <div className="flex items-center gap-1 border-l border-line pl-3">
          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setReadingFontSize(readingFontSize - 2)} aria-label="Smaller text">
            <Minus size={14} />
          </button>
          <span className="w-8 text-center text-xs text-muted tabular-nums">{readingFontSize}</span>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setReadingFontSize(readingFontSize + 2)} aria-label="Larger text">
            <Plus size={14} />
          </button>
        </div>
        <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close reading mode" title="Esc">
          <X size={18} />
        </button>
      </div>
      <div className="h-1 bg-surface-3">
        <div className={`h-full transition-[width] ${left < 0 ? 'bg-danger' : 'bg-accent'}`} style={{ width: `${Math.min(100, (spent / targetSeconds) * 100)}%` }} />
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-3xl px-6 pt-8 pb-[50vh]" style={{ fontSize: readingFontSize }}>
          {blocks.map((b, i) => {
            const t = plan.blocks[i];
            return (
              <section
                key={b.id}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                onClick={() => setHere(i)}
                className={`relative mb-[1.2em] cursor-pointer scroll-mt-6 rounded-xl border-l-4 py-[0.4em] pr-4 pl-[0.8em] transition-colors ${
                  i === here ? 'border-accent bg-accent-softer' : 'border-transparent hover:bg-surface-2/60'
                }`}
              >
                <div className="mb-[0.3em] flex items-baseline gap-3 text-[0.55em] font-medium text-faint">
                  <span className="font-mono">{clock(t.start)}</span>
                  {started && i === due && <span className="rounded bg-surface-3 px-1.5 text-muted">you should be here</span>}
                </div>
                {b.title && <h2 className="mb-[0.3em] text-[1.05em] leading-snug font-semibold">{b.title}</h2>}
                <div className="leading-[1.55] whitespace-pre-wrap">{b.body || <span className="text-faint">Empty</span>}</div>
              </section>
            );
          })}
        </div>
      </div>
      <div className="border-t border-line bg-surface px-4 py-1.5 text-center text-xs text-faint">
        <kbd>Space</kbd> start/pause · <kbd>↑</kbd> <kbd>↓</kbd> or tap to mark where you are · <kbd>Esc</kbd> close
      </div>
    </div>
  );
}
