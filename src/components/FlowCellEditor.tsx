import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { updateCell } from '../lib/repo';
import type { FlowCell, Speech } from '../types';
import { KindBadge } from './KindBadge';

export interface CellHandle {
  focus: (atEnd?: boolean) => void;
  /** Append a line to the cell and save immediately. */
  appendLine: (line: string) => void;
  getText: () => string;
}

interface Props {
  ref: Ref<CellHandle>;
  roundId: string;
  rowId: string;
  speech: Speech;
  cell?: FlowCell;
  ours: boolean;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

const SAVE_DELAY = 300;

export function FlowCellEditor({ ref, roundId, rowId, speech, cell, ours, onKeyDown }: Props) {
  const [text, setText] = useState(cell?.text ?? '');
  const saved = useRef(cell?.text ?? '');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const el = useRef<HTMLTextAreaElement>(null);

  // Pick up changes made elsewhere (import, another tab) unless we have unsaved edits.
  useEffect(() => {
    const incoming = cell?.text ?? '';
    if (incoming !== saved.current && timer.current === null) {
      saved.current = incoming;
      setText(incoming);
    }
  }, [cell?.text]);

  const flush = (value: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (value === saved.current) return;
    saved.current = value;
    void updateCell(roundId, rowId, speech, { text: value });
  };

  const change = (value: string) => {
    setText(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => flush(value), SAVE_DELAY);
  };

  // Save pending edits if the cell unmounts (row deleted, view switched).
  const latest = useRef(text);
  latest.current = text;
  useEffect(() => () => flush(latest.current), []); // eslint-disable-line react-hooks/exhaustive-deps

  useImperativeHandle(ref, () => ({
    focus: (atEnd = true) => {
      const t = el.current;
      if (!t) return;
      t.focus();
      if (atEnd) t.setSelectionRange(t.value.length, t.value.length);
    },
    appendLine: (line) => {
      const cur = latest.current;
      const next = cur && !cur.endsWith('\n') ? `${cur}\n${line}` : `${cur}${line}`;
      setText(next);
      flush(next);
    },
    getText: () => latest.current,
  }));

  // Grow with content so long responses stay readable.
  useEffect(() => {
    const t = el.current;
    if (!t) return;
    t.style.height = 'auto';
    t.style.height = `${t.scrollHeight}px`;
  }, [text]);

  return (
    <div
      className={`relative h-full border-r border-slate-200 dark:border-slate-800 ${
        ours ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''
      }`}
    >
      {cell?.kind && (
        <span className="pointer-events-none absolute top-1 right-1">
          <KindBadge kind={cell.kind} />
        </span>
      )}
      <textarea
        ref={el}
        rows={2}
        value={text}
        aria-label={`${speech} cell`}
        onChange={(e) => change(e.target.value)}
        onBlur={() => flush(text)}
        onKeyDown={onKeyDown}
        className="block min-h-[3.5rem] w-full resize-none overflow-hidden bg-transparent px-2 py-1.5 pr-9 text-sm leading-snug outline-none focus:bg-sky-50 dark:focus:bg-sky-950/40"
      />
    </div>
  );
}
