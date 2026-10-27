import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { db } from '../db';
import {
  deleteRow,
  formatInsert,
  insertRow,
  linkRowArgument,
  recordInsert,
  toggleKind,
  updateCell,
} from '../lib/repo';
import { KIND_SHORTCUTS, SPEECH_NAMES, firstSpeakingSide, flowColumns, roundSegments, speechSide } from '../lib/speeches';
import { useApp } from '../store';
import { type BankResponse, type FlowRow, KIND_LABELS, type Side, type Speech } from '../types';
import { type CellHandle, FlowCellEditor } from './FlowCellEditor';
import { QuickInsert } from './QuickInsert';
import { SaveToBankDialog } from './SaveToBankDialog';
import { TimerBar } from './TimerBar';

type Target = { rowId: string; speech: Speech };
const key = (rowId: string, speech: Speech) => `${rowId}:${speech}`;

export function FlowView() {
  const { roundId, sheet: storedSheet, setSheet, timers, toggleSpeech, togglePrep, setView } = useApp();
  // null = no such round (deleted); undefined = still loading.
  const round = useLiveQuery(
    async () => (roundId ? ((await db.rounds.get(roundId)) ?? null) : null),
    [roundId],
  );
  const resolutionId = round?.resolutionId;
  const args = useLiveQuery(
    () => (resolutionId ? db.args.where('resolutionId').equals(resolutionId).toArray() : []),
    [resolutionId],
  );
  const responses = useLiveQuery(async () => {
    if (!args?.length) return [];
    return db.responses.where('argumentId').anyOf(args.map((a) => a.id)).toArray();
  }, [args]);
  const theirSide: Side | undefined = round ? (round.ourSide === 'PRO' ? 'CON' : 'PRO') : undefined;
  const sheet: Side = storedSheet ?? theirSide ?? 'PRO';
  const rows = useLiveQuery(
    async () => (roundId ? (await db.rows.where({ roundId, sheet }).toArray()).sort((a, b) => a.order - b.order) : []),
    [roundId, sheet],
  );
  const cells = useLiveQuery(() => (roundId ? db.cells.where('roundId').equals(roundId).toArray() : []), [roundId]);
  const cellMap = useMemo(() => new Map((cells ?? []).map((c) => [key(c.rowId, c.speech), c])), [cells]);

  const handles = useRef(new Map<string, CellHandle>());
  const pendingFocus = useRef<string | null>(null);
  const [insertFor, setInsertFor] = useState<Target | null>(null);
  const [saveFor, setSaveFor] = useState<Target | null>(null);

  const columns = useMemo(
    () => (round ? flowColumns(firstSpeakingSide(round.ourSide, round.speakingOrder)) : []),
    [round],
  );
  const segments = useMemo(
    () => (round ? roundSegments(firstSpeakingSide(round.ourSide, round.speakingOrder)) : []),
    [round],
  );
  const currentSpeech = segments.find((s) => s.id === timers.segmentId)?.speech;

  const focus = useCallback((rowId: string, speech: Speech) => {
    const h = handles.current.get(key(rowId, speech));
    if (h) h.focus();
    else pendingFocus.current = key(rowId, speech);
  }, []);

  const registerHandle = (k: string) => (h: CellHandle | null) => {
    if (h) {
      handles.current.set(k, h);
      if (pendingFocus.current === k) {
        pendingFocus.current = null;
        h.focus();
      }
    } else handles.current.delete(k);
  };

  // Space toggles the speech clock, P / Shift+P the prep clocks, when not typing.
  useEffect(() => {
    if (!round) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [role="dialog"]') || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.code === 'Space') {
        e.preventDefault();
        toggleSpeech();
      } else if (e.code === 'KeyP') {
        e.preventDefault();
        togglePrep(e.shiftKey ? (round.ourSide === 'PRO' ? 'CON' : 'PRO') : round.ourSide);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [round, toggleSpeech, togglePrep]);

  if (!roundId || round === null) {
    return (
      <div className="p-6 text-sm text-slate-500">
        No round open.{' '}
        <button className="text-sky-600 underline" onClick={() => setView('rounds')}>
          Start or open a round
        </button>
        .
      </div>
    );
  }
  if (!round || !rows || !args || !responses) return null;

  const onCellKey = (row: FlowRow, rowIndex: number, speech: Speech) => (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget;
    const col = columns.indexOf(speech);

    if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const before = ta.value.slice(0, ta.selectionStart);
      if (before === '' || /\s$/.test(before)) {
        e.preventDefault();
        setInsertFor({ rowId: row.id, speech });
      }
      return;
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (ta.value.trim()) setSaveFor({ rowId: row.id, speech });
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      void insertRow(round.id, sheet, row.order).then((r) => focus(r.id, speech));
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const dir = e.shiftKey ? -1 : 1;
      let c = col + dir;
      let r = rowIndex;
      if (c >= columns.length) [c, r] = [0, r + 1];
      if (c < 0) [c, r] = [columns.length - 1, r - 1];
      if (rows[r]) focus(rows[r].id, columns[c]);
      return;
    }
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      const r = rows[rowIndex + (e.key === 'ArrowUp' ? -1 : 1)];
      if (r) focus(r.id, speech);
      return;
    }
    if (e.altKey && KIND_SHORTCUTS[e.code]) {
      e.preventDefault();
      const current = cellMap.get(key(row.id, speech))?.kind;
      void updateCell(round.id, row.id, speech, { kind: toggleKind(current, KIND_SHORTCUTS[e.code]) });
      return;
    }
    if (e.key === 'Escape') ta.blur();
  };

  const pick = async (r: BankResponse) => {
    if (!insertFor) return;
    const { rowId, speech } = insertFor;
    setInsertFor(null);
    handles.current.get(key(rowId, speech))?.appendLine(formatInsert(r, KIND_LABELS[r.kind]));
    await recordInsert(round.id, rowId, speech, r);
    // Inserting into an unlinked row links it to that response's argument.
    const row = rows.find((x) => x.id === rowId);
    if (row && !row.argumentId) await linkRowArgument(rowId, r.argumentId);
    focus(rowId, speech);
  };

  const sheetArgs = args.filter((a) => a.side === sheet);
  const constructive: Speech = sheet === 'PRO' ? 'PC' : 'CC';
  const saveRow = saveFor && rows.find((r) => r.id === saveFor.rowId);

  return (
    <div className="flex h-full flex-col">
      <TimerBar round={round} segments={segments} />

      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <div className="flex overflow-hidden rounded-md border border-slate-300 dark:border-slate-700" role="tablist">
          {([theirSide!, round.ourSide] as Side[]).map((s) => (
            <button
              key={s}
              role="tab"
              aria-selected={sheet === s}
              onClick={() => setSheet(s)}
              className={`px-3 py-1 text-sm font-medium ${
                sheet === s ? 'bg-sky-600 text-white' : 'bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800'
              }`}
            >
              {s === round.ourSide ? `Our case (${s})` : `Their case (${s})`}
            </button>
          ))}
        </div>
        <span className="truncate text-sm text-slate-500">
          {[round.tournament, round.roundName, round.opponents && `vs ${round.opponents}`].filter(Boolean).join(' · ')}
        </span>
        <span className="ml-auto hidden text-xs text-slate-500 lg:inline">
          <kbd>/</kbd> insert · <kbd>Enter</kbd> new row · <kbd>Tab</kbd> next speech · <kbd>Ctrl+Enter</kbd> save to bank ·{' '}
          <kbd>Alt+1–6</kbd> tag · <kbd>Space</kbd> timer · <kbd>P</kbd> prep
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-3 pb-3">
        <div
          className="panel grid min-w-max"
          style={{ gridTemplateColumns: `11rem repeat(${columns.length}, minmax(12rem, 1fr))` }}
        >
          <div className="sticky top-0 left-0 z-20 border-r border-b border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900">
            Argument
          </div>
          {columns.map((s) => (
            <div
              key={s}
              title={SPEECH_NAMES[s]}
              className={`sticky top-0 z-10 border-r border-b border-slate-200 px-2 py-1.5 text-xs font-bold dark:border-slate-800 ${
                speechSide(s) === round.ourSide
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-white dark:bg-slate-900'
              } ${s === currentSpeech ? 'underline decoration-sky-500 decoration-2 underline-offset-4' : ''}`}
            >
              {s} <span className="font-normal text-slate-400">{SPEECH_NAMES[s]}</span>
            </div>
          ))}

          {rows.map((row, i) => (
            <div key={row.id} className="contents">
              <div className="sticky left-0 z-10 flex flex-col gap-1 border-r border-b border-slate-200 bg-white p-1.5 dark:border-slate-800 dark:bg-slate-900">
                <select
                  className="input py-0.5 text-xs"
                  value={row.argumentId ?? ''}
                  onChange={(e) => linkRowArgument(row.id, e.target.value || undefined)}
                  aria-label="Linked bank argument"
                >
                  <option value="">— link argument —</option>
                  {sheetArgs.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title}
                    </option>
                  ))}
                </select>
                <button
                  className="self-start text-xs text-slate-400 hover:text-rose-500"
                  onClick={async () => {
                    if (rows.length === 1 && !confirm('Clear the last row?')) return;
                    await deleteRow(row.id);
                    if (rows.length === 1) await insertRow(round.id, sheet);
                  }}
                >
                  remove row
                </button>
              </div>
              {columns.map((speech) => (
                <div key={speech} className="border-b border-slate-200 dark:border-slate-800">
                  <FlowCellEditor
                    ref={registerHandle(key(row.id, speech))}
                    roundId={round.id}
                    rowId={row.id}
                    speech={speech}
                    cell={cellMap.get(key(row.id, speech))}
                    ours={speechSide(speech) === round.ourSide}
                    onKeyDown={onCellKey(row, i, speech)}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
        <button className="btn mt-2" onClick={() => insertRow(round.id, sheet).then((r) => focus(r.id, constructive))}>
          + Row
        </button>
      </div>

      {insertFor && (
        <QuickInsert
          responses={responses}
          args={args}
          preferArgumentId={rows.find((r) => r.id === insertFor.rowId)?.argumentId}
          onPick={pick}
          onClose={() => {
            const t = insertFor;
            setInsertFor(null);
            focus(t.rowId, t.speech);
          }}
        />
      )}
      {saveFor && saveRow && (
        <SaveToBankDialog
          resolutionId={round.resolutionId}
          args={args}
          sheet={sheet}
          text={handles.current.get(key(saveFor.rowId, saveFor.speech))?.getText() ?? ''}
          kind={cellMap.get(key(saveFor.rowId, saveFor.speech))?.kind}
          argumentId={saveRow.argumentId}
          suggestedTitle={(cellMap.get(key(saveRow.id, constructive))?.text ?? '').split('\n')[0].slice(0, 80)}
          onSaved={async (argumentId) => {
            if (!saveRow.argumentId) await linkRowArgument(saveRow.id, argumentId);
            const t = saveFor;
            setSaveFor(null);
            focus(t.rowId, t.speech);
          }}
          onClose={() => {
            const t = saveFor;
            setSaveFor(null);
            focus(t.rowId, t.speech);
          }}
        />
      )}
    </div>
  );
}
