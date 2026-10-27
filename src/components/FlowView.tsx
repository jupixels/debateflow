import { useLiveQuery } from 'dexie-react-hooks';
import { Keyboard, Link2, MessagesSquare, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { db } from '../db';
import {
  deleteRow,
  formatConcession,
  formatInsert,
  insertRow,
  linkRowArgument,
  recordInsert,
  toggleKind,
  updateCell,
} from '../lib/repo';
import { KIND_SHORTCUTS, firstSpeakingSide, flowColumns, roundSegments, speechSide } from '../lib/speeches';
import { DEFAULT_ARG_COL_WIDTH, DEFAULT_COL_WIDTH, confirmAction, toast, useApp } from '../store';
import { type BankResponse, type FlowRow, KIND_LABELS, type Side, type Speech } from '../types';
import { CrossfirePanel } from './CrossfirePanel';
import { type CellHandle, FlowCellEditor } from './FlowCellEditor';
import { QuickInsert } from './QuickInsert';
import { SaveToBankDialog } from './SaveToBankDialog';
import { TimerBar } from './TimerBar';
import { EmptyState } from './ui';
import { useLabels } from '../hooks/useLabels';

type Target = { rowId: string; speech: Speech };
const key = (rowId: string, speech: Speech) => `${rowId}:${speech}`;
const CX_IDS = ['CF1', 'CF2', 'GCF'];

export function FlowView({ onShortcuts }: { onShortcuts: () => void }) {
  const {
    roundId,
    sheet: storedSheet,
    setSheet,
    timers,
    toggleSpeech,
    togglePrep,
    selectSegment,
    setView,
    colWidths,
    setColWidth,
    cxOpen,
    setCxOpen,
    cxAuto,
  } = useApp();
  // null = no such round (deleted); undefined = still loading.
  const round = useLiveQuery(async () => (roundId ? ((await db.rounds.get(roundId)) ?? null) : null), [roundId]);
  const resolutionId = round?.resolutionId;
  const args = useLiveQuery(
    () => (resolutionId ? db.args.where('resolutionId').equals(resolutionId).toArray() : []),
    [resolutionId],
  );
  const responses = useLiveQuery(async () => {
    if (!args?.length) return [];
    return db.responses.where('argumentId').anyOf(args.map((a) => a.id)).toArray();
  }, [args]);
  const concessions = useLiveQuery(
    async () => (roundId ? (await db.cx.where('roundId').equals(roundId).sortBy('createdAt')).filter((e) => e.concession) : []),
    [roundId],
  );
  const theirSide: Side | undefined = round ? (round.ourSide === 'PRO' ? 'CON' : 'PRO') : undefined;
  const sheet: Side = storedSheet ?? theirSide ?? 'PRO';
  const rows = useLiveQuery(
    async () => (roundId ? (await db.rows.where({ roundId, sheet }).toArray()).sort((a, b) => a.order - b.order) : []),
    [roundId, sheet],
  );
  const theirRows = useLiveQuery(
    async () => (roundId && theirSide ? db.rows.where({ roundId, sheet: theirSide }).toArray() : []),
    [roundId, theirSide],
  );
  const cells = useLiveQuery(() => (roundId ? db.cells.where('roundId').equals(roundId).toArray() : []), [roundId]);
  const cellMap = useMemo(() => new Map((cells ?? []).map((c) => [key(c.rowId, c.speech), c])), [cells]);

  const label = useLabels();
  const handles = useRef(new Map<string, CellHandle>());
  const pendingFocus = useRef<string | null>(null);
  const lastCell = useRef<Target | null>(null);
  const [insertFor, setInsertFor] = useState<Target | null>(null);
  const [saveFor, setSaveFor] = useState<Target | null>(null);

  const firstSide = round ? firstSpeakingSide(round.ourSide, round.speakingOrder) : 'PRO';
  const columns = useMemo(() => flowColumns(firstSide), [firstSide]);
  const segments = useMemo(() => roundSegments(firstSide), [firstSide]);
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

  // Open the crossfire panel when the timer moves onto a crossfire (not on first render).
  const prevSegment = useRef(timers.segmentId);
  useEffect(() => {
    if (prevSegment.current !== timers.segmentId && cxAuto && CX_IDS.includes(timers.segmentId)) setCxOpen(true);
    prevSegment.current = timers.segmentId;
  }, [timers.segmentId, cxAuto, setCxOpen]);

  // Space / N / P / Shift+P / X work anywhere on the flow except while typing.
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
      } else if (e.code === 'KeyN') {
        e.preventDefault();
        const i = segments.findIndex((s) => s.id === useApp.getState().timers.segmentId);
        if (i >= 0 && i < segments.length - 1) selectSegment(segments[i + 1].id, segments[i + 1].seconds);
      } else if (e.code === 'KeyX') {
        e.preventDefault();
        setCxOpen(!useApp.getState().cxOpen);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [round, segments, toggleSpeech, togglePrep, selectSegment, setCxOpen]);

  if (!roundId || round === null) {
    return (
      <EmptyState
        icon={<MessagesSquare size={20} />}
        title="No round open"
        action={
          <button className="btn btn-primary" onClick={() => setView('rounds')}>
            Start or open a round
          </button>
        }
      />
    );
  }
  if (!round || !rows || !args || !responses) return null;

  const widthOf = (k: string) => colWidths[k] ?? (k === 'arg' ? DEFAULT_ARG_COL_WIDTH : DEFAULT_COL_WIDTH);

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
      else toast('Write something in the cell first, then save it to your bank.');
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

  const insertIntoLastCell = (text: string) => {
    const t = lastCell.current;
    const h = t && handles.current.get(key(t.rowId, t.speech));
    if (!t || !h) {
      toast('Click the flow cell you want it in first, then press Insert again.');
      return;
    }
    h.appendLine(text);
    h.focus();
    toast(`Added to ${label.speech(t.speech)}.`, 'success');
  };

  const removeRow = async (row: FlowRow) => {
    const hasText = columns.some((s) => cellMap.get(key(row.id, s))?.text.trim());
    if (hasText && !(await confirmAction('Delete this row?', 'Everything flowed on it is removed.'))) return;
    await deleteRow(row.id);
    if (rows.length === 1) await insertRow(round.id, sheet);
  };

  const startResize = (k: string) => (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = widthOf(k);
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    document.body.style.cursor = 'col-resize';
    const move = (ev: PointerEvent) => setColWidth(k, startW + ev.clientX - startX);
    const up = () => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
      target.removeEventListener('pointercancel', up);
      document.body.style.cursor = '';
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
    target.addEventListener('pointercancel', up);
  };

  // A plain render function (not a component) so the handle's DOM node, which holds
  // the pointer capture, survives the re-renders a drag causes.
  const resizeHandle = (k: string, label: string) => (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize ${label} column`}
      aria-valuenow={widthOf(k)}
      tabIndex={0}
      title="Drag to resize · double-click to reset"
      onPointerDown={startResize(k)}
      onDoubleClick={() => setColWidth(k, null)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
          setColWidth(k, widthOf(k) + (e.key === 'ArrowRight' ? 16 : -16));
        }
      }}
      className="group/handle absolute top-0 -right-1.5 z-10 flex h-full w-3 cursor-col-resize touch-none justify-center"
    >
      <span className="h-full w-0.5 rounded-full bg-transparent transition-colors group-hover/handle:bg-accent group-focus-visible/handle:bg-accent group-active/handle:bg-accent" />
    </div>
  );

  const sheetArgs = args.filter((a) => a.side === sheet);
  const constructive: Speech = sheet === 'PRO' ? 'PC' : 'CC';
  const saveRow = saveFor && rows.find((r) => r.id === saveFor.rowId);
  const gridTemplate = `${widthOf('arg')}px ${columns.map((s) => `${widthOf(s)}px`).join(' ')}`;
  const linkedTheirArgs = (theirRows ?? []).map((r) => r.argumentId).filter((x): x is string => !!x);

  return (
    <div className="flex h-full flex-col">
      <TimerBar round={round} segments={segments} />

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 sm:px-4">
            <div className="seg" role="tablist" aria-label="Flow sheet">
              {([theirSide!, round.ourSide] as Side[]).map((s) => (
                <button key={s} role="tab" aria-selected={sheet === s} onClick={() => setSheet(s)}>
                  {s === round.ourSide ? 'Our case' : 'Their case'}
                  <span className="ml-1.5 text-xs text-faint">{label.side(s)}</span>
                </button>
              ))}
            </div>
            <span className="hidden truncate text-sm text-muted sm:inline">
              {[round.tournament, round.roundName, round.opponents && `vs ${round.opponents}`].filter(Boolean).join(' · ')}
            </span>
            <div className="ml-auto flex items-center gap-1.5">
              <button className="btn btn-ghost btn-sm hidden md:inline-flex" onClick={onShortcuts}>
                <Keyboard size={14} /> Shortcuts
              </button>
              <button className={`btn btn-sm ${cxOpen ? 'border-accent bg-accent-soft text-accent-text' : ''}`} onClick={() => setCxOpen(!cxOpen)} title="Crossfire panel (X)" aria-pressed={cxOpen}>
                <MessagesSquare size={14} /> Crossfire
                {!!concessions?.length && <span className="rounded-full bg-warn px-1.5 text-[0.65rem] font-bold text-black">{concessions.length}</span>}
              </button>
            </div>
          </div>

          {/* The card itself scrolls, so the sticky header row and argument column pin to its edges. */}
          <div className="flex min-h-0 flex-1 flex-col items-start px-3 pb-3 sm:px-4">
            <div className="card max-h-full max-w-full min-h-0 overflow-auto">
              <div className="grid" style={{ gridTemplateColumns: gridTemplate }}>
                <div className="sticky top-0 left-0 z-30 flex items-end border-r border-b border-line bg-surface-2 px-3 py-2">
                  <span className="eyebrow">Argument</span>
                  {resizeHandle('arg', 'argument')}
                </div>
                {columns.map((s) => {
                  const ours = speechSide(s) === round.ourSide;
                  const current = s === currentSpeech;
                  return (
                    <div
                      key={s}
                      className={`sticky top-0 z-20 border-r border-b border-line px-3 py-2 last:border-r-0 ${
                        current ? 'bg-accent-soft' : 'bg-surface-2'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`font-mono text-xs font-bold ${ours ? 'text-accent-text' : ''}`}>{label.speech(s)}</span>
                        {ours && <span className="rounded bg-accent-soft px-1 text-[0.6rem] font-semibold text-accent-text">US</span>}
                        {current && <span className="ml-auto size-1.5 animate-pulse rounded-full bg-accent" title="Current speech" />}
                      </div>
                      <div className="truncate text-[0.7rem] text-faint">{label.speechName(s)}</div>
                      {current && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-accent" />}
                      {resizeHandle(s, label.speech(s))}
                    </div>
                  );
                })}

                {rows.map((row, i) => (
                  <div key={row.id} className="group/row contents">
                    <div className="sticky left-0 z-10 flex flex-col gap-1 border-r border-b border-line bg-surface px-2 py-2 group-last/row:border-b-0">
                      <div className="flex items-center gap-1">
                        <span className="w-5 text-center font-mono text-[0.65rem] text-faint">{i + 1}</span>
                        <div className="relative min-w-0 flex-1">
                          <Link2 size={12} className={`pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 ${row.argumentId ? 'text-accent-text' : 'text-faint'}`} />
                          <select
                            className={`h-7 w-full appearance-none truncate rounded-md border bg-transparent pr-1 pl-6 text-xs outline-none focus:border-accent ${
                              row.argumentId ? 'border-accent/40 bg-accent-softer font-medium' : 'border-dashed border-line-strong text-muted'
                            }`}
                            value={row.argumentId ?? ''}
                            onChange={(e) => linkRowArgument(row.id, e.target.value || undefined)}
                            aria-label="Linked bank argument"
                            title="Link this row to a bank argument so / shows its responses first"
                          >
                            <option value="">Link argument…</option>
                            {sheetArgs.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.title}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <button
                        className="ml-6 flex items-center gap-1 self-start rounded px-1 text-[0.68rem] text-faint opacity-0 group-hover/row:opacity-100 hover:text-danger focus:opacity-100 pointer-coarse:opacity-100"
                        onClick={() => removeRow(row)}
                      >
                        <Trash2 size={11} /> Remove
                      </button>
                    </div>
                    {columns.map((speech) => (
                      <div
                        key={speech}
                        className={`border-r border-b border-line last:border-r-0 group-last/row:border-b-0 ${
                          speech === currentSpeech ? 'bg-accent-softer' : speechSide(speech) === round.ourSide ? 'bg-surface-2/40' : ''
                        }`}
                      >
                        <FlowCellEditor
                          ref={registerHandle(key(row.id, speech))}
                          roundId={round.id}
                          rowId={row.id}
                          speech={speech}
                          width={widthOf(speech)}
                          cell={cellMap.get(key(row.id, speech))}
                          placeholder={i === 0 && rows.length === 1 && speech === constructive ? 'Flow their contention here…' : undefined}
                          onKeyDown={onCellKey(row, i, speech)}
                          onFocus={() => (lastCell.current = { rowId: row.id, speech })}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <button className="btn btn-ghost btn-sm mt-2 shrink-0 text-muted" onClick={() => insertRow(round.id, sheet).then((r) => focus(r.id, constructive))}>
              <Plus size={14} /> Add row
            </button>
          </div>
        </div>

        {cxOpen && (
          // Docked beside the flow on laptops; slides over it on tablets and phones.
          <div className="fixed top-13 right-0 bottom-0 z-30 w-full shadow-pop sm:w-auto lg:static lg:z-auto lg:shadow-none">
            <CrossfirePanel
              round={round}
              timerSegment={timers.segmentId}
              linkedArgumentIds={linkedTheirArgs}
              onInsert={insertIntoLastCell}
              onClose={() => setCxOpen(false)}
            />
          </div>
        )}
      </div>

      {insertFor && (
        <QuickInsert
          responses={responses}
          args={args}
          concessions={concessions ?? []}
          preferArgumentId={rows.find((r) => r.id === insertFor.rowId)?.argumentId}
          onPick={pick}
          onPickConcession={(e) => {
            const t = insertFor;
            setInsertFor(null);
            handles.current.get(key(t.rowId, t.speech))?.appendLine(formatConcession(e));
            focus(t.rowId, t.speech);
          }}
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
