import { Check, Eye, EyeOff, MoveHorizontal, RotateCcw } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Speech } from '../types';

export interface ColumnMenuProps {
  x: number;
  y: number;
  /** The column that was right-clicked, if any. */
  target?: Speech;
  columns: Speech[];
  hidden: Speech[];
  isDefault: boolean;
  code: (s: Speech) => string;
  name: (s: Speech) => string;
  onToggle: (s: Speech) => void;
  onResetWidth?: (s: Speech) => void;
  onShowAll: () => void;
  onResetDefault: () => void;
  onClose: () => void;
}

export function ColumnMenu(p: ColumnMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: p.x, top: p.y });

  // Keep the menu on screen.
  useLayoutEffect(() => {
    const r = ref.current!.getBoundingClientRect();
    setPos({
      left: Math.max(8, Math.min(p.x, window.innerWidth - r.width - 8)),
      top: Math.max(8, Math.min(p.y, window.innerHeight - r.height - 8)),
    });
  }, [p.x, p.y]);

  useEffect(() => {
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) p.onClose();
    };
    window.addEventListener('pointerdown', close, true);
    window.addEventListener('keydown', close);
    window.addEventListener('resize', p.onClose);
    return () => {
      window.removeEventListener('pointerdown', close, true);
      window.removeEventListener('keydown', close);
      window.removeEventListener('resize', p.onClose);
    };
  }, [p]);

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, []);

  const item = 'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm outline-none hover:bg-surface-3/70 focus:bg-surface-3/70';

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Columns"
      className="card animate-pop fixed z-[70] w-64 p-1 shadow-pop"
      style={pos}
      onKeyDown={(e) => {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        e.preventDefault();
        const items = [...ref.current!.querySelectorAll<HTMLElement>('[role^="menuitem"]')];
        const i = items.indexOf(document.activeElement as HTMLElement);
        items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus();
      }}
    >
      {p.target && (
        <>
          <button role="menuitem" className={item} onClick={() => (p.onToggle(p.target!), p.onClose())}>
            <EyeOff size={14} className="text-muted" /> Hide {p.code(p.target)}
          </button>
          {p.onResetWidth && (
            <button role="menuitem" className={item} onClick={() => (p.onResetWidth!(p.target!), p.onClose())}>
              <MoveHorizontal size={14} className="text-muted" /> Reset width
            </button>
          )}
          <div className="my-1 border-t border-line" />
        </>
      )}
      <div className="eyebrow px-2.5 pt-1 pb-1">Columns on this sheet</div>
      {p.columns.map((s) => {
        const shown = !p.hidden.includes(s);
        return (
          <button key={s} role="menuitemcheckbox" aria-checked={shown} className={item} onClick={() => p.onToggle(s)}>
            <span className={`grid size-4 place-items-center rounded border ${shown ? 'border-accent bg-accent text-accent-ink' : 'border-line-strong'}`}>
              {shown && <Check size={11} strokeWidth={3} />}
            </span>
            <span className="w-9 font-mono text-xs font-semibold">{p.code(s)}</span>
            <span className="truncate text-muted">{p.name(s)}</span>
          </button>
        );
      })}
      <div className="my-1 border-t border-line" />
      <button role="menuitem" className={item} disabled={p.hidden.length === 0} onClick={() => (p.onShowAll(), p.onClose())}>
        <Eye size={14} className="text-muted" /> Show all columns
      </button>
      <button role="menuitem" className={item} disabled={p.isDefault} onClick={() => (p.onResetDefault(), p.onClose())}>
        <RotateCcw size={14} className="text-muted" /> Reset to this sheet’s default
      </button>
    </div>
  );
}
