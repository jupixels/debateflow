import { db, newId } from '../db';
import type {
  Argument,
  BankResponse,
  CxEntry,
  CxQuestion,
  FlowCell,
  FlowRow,
  Resolution,
  ResponseKind,
  Round,
  Side,
  Speech,
} from '../types';

// ---- Bank ----

export async function createResolution(title: string, monthRange?: string): Promise<Resolution> {
  const r: Resolution = { id: newId(), title: title.trim(), monthRange, createdAt: Date.now() };
  await db.resolutions.add(r);
  return r;
}

export async function deleteResolution(id: string) {
  await db.transaction('rw', [db.resolutions, db.args, db.responses, db.questions], async () => {
    const argIds = (await db.args.where('resolutionId').equals(id).toArray()).map((a) => a.id);
    await db.responses.where('argumentId').anyOf(argIds).delete();
    await db.questions.where('argumentId').anyOf(argIds).delete();
    await db.args.bulkDelete(argIds);
    await db.resolutions.delete(id);
  });
}

export async function createArgument(resolutionId: string, side: Side, title: string): Promise<Argument> {
  const a: Argument = { id: newId(), resolutionId, side, title: title.trim(), createdAt: Date.now() };
  await db.args.add(a);
  return a;
}

export async function deleteArgument(id: string) {
  await db.transaction('rw', [db.args, db.responses, db.questions, db.rows], async () => {
    await db.responses.where('argumentId').equals(id).delete();
    await db.questions.where('argumentId').equals(id).delete();
    await db.args.delete(id);
    // Unlink flow rows that pointed at this argument.
    await db.rows.filter((r) => r.argumentId === id).modify({ argumentId: undefined });
  });
}

export type ResponseDraft = Omit<BankResponse, 'id' | 'createdAt' | 'timesUsed'> &
  Partial<Pick<BankResponse, 'id' | 'createdAt' | 'timesUsed'>>;

export async function saveResponse(draft: ResponseDraft): Promise<BankResponse> {
  const r: BankResponse = {
    timesUsed: 0,
    createdAt: Date.now(),
    ...draft,
    id: draft.id ?? newId(),
    tag: draft.tag.trim(),
  };
  await db.responses.put(r);
  return r;
}

export const deleteResponse = (id: string) => db.responses.delete(id);

// ---- Rounds & flow ----

export type RoundDraft = Omit<Round, 'id' | 'createdAt'>;

export async function createRound(draft: RoundDraft): Promise<Round> {
  const round: Round = { ...draft, id: newId(), createdAt: Date.now() };
  await db.transaction('rw', [db.rounds, db.rows], async () => {
    await db.rounds.add(round);
    // Start each sheet with one empty row so you can type right away.
    await db.rows.bulkAdd([
      { id: newId(), roundId: round.id, sheet: 'PRO', order: 0 },
      { id: newId(), roundId: round.id, sheet: 'CON', order: 0 },
    ]);
  });
  return round;
}

export async function deleteRound(id: string) {
  await db.transaction('rw', [db.rounds, db.rows, db.cells, db.cx], async () => {
    await db.cells.where('roundId').equals(id).delete();
    await db.cx.where('roundId').equals(id).delete();
    await db.rows.where('roundId').equals(id).delete();
    await db.rounds.delete(id);
  });
}

/** Insert a row right after `afterOrder` (or at the end), shifting later rows down. */
export async function insertRow(roundId: string, sheet: Side, afterOrder?: number): Promise<FlowRow> {
  return db.transaction('rw', db.rows, async () => {
    const rows = await db.rows.where({ roundId, sheet }).toArray();
    const order = afterOrder === undefined ? rows.reduce((m, r) => Math.max(m, r.order + 1), 0) : afterOrder + 1;
    for (const r of rows) {
      if (r.order >= order) await db.rows.update(r.id, { order: r.order + 1 });
    }
    const row: FlowRow = { id: newId(), roundId, sheet, order };
    await db.rows.add(row);
    return row;
  });
}

export async function deleteRow(rowId: string) {
  await db.transaction('rw', [db.rows, db.cells], async () => {
    await db.cells.where('rowId').equals(rowId).delete();
    await db.rows.delete(rowId);
  });
}

export const linkRowArgument = (rowId: string, argumentId: string | undefined) =>
  db.rows.update(rowId, { argumentId });

export async function getOrCreateCell(roundId: string, rowId: string, speech: Speech): Promise<FlowCell> {
  const existing = await db.cells.where({ rowId, speech }).first();
  if (existing) return existing;
  const cell: FlowCell = { id: newId(), roundId, rowId, speech, text: '', linkedResponseIds: [] };
  await db.cells.add(cell);
  return cell;
}

export async function updateCell(
  roundId: string,
  rowId: string,
  speech: Speech,
  patch: Partial<Pick<FlowCell, 'text' | 'kind' | 'linkedResponseIds'>>,
) {
  await db.transaction('rw', db.cells, async () => {
    const cell = await getOrCreateCell(roundId, rowId, speech);
    await db.cells.update(cell.id, patch);
  });
}

export const formatInsert = (r: BankResponse, kindLabel: string) =>
  `[${kindLabel}] ${r.tag}${r.isCard && r.cite ? ` (${r.cite.split(',')[0].trim()})` : ''}`;

/** Record a quick-insert: bump the response's use count and link it to the cell. */
export async function recordInsert(roundId: string, rowId: string, speech: Speech, response: BankResponse) {
  await db.transaction('rw', [db.cells, db.responses], async () => {
    const cell = await getOrCreateCell(roundId, rowId, speech);
    const ids = cell.linkedResponseIds.includes(response.id)
      ? cell.linkedResponseIds
      : [...cell.linkedResponseIds, response.id];
    await db.cells.update(cell.id, { linkedResponseIds: ids, kind: cell.kind ?? response.kind });
    await db.responses.update(response.id, { timesUsed: response.timesUsed + 1 });
  });
}

export const toggleKind = (current: ResponseKind | undefined, next: ResponseKind) =>
  current === next ? undefined : next;

export const renameArgument = (id: string, title: string) => db.args.update(id, { title: title.trim() });

// ---- Crossfire ----

export async function createQuestion(argumentId: string, text: string): Promise<CxQuestion> {
  const q: CxQuestion = { id: newId(), argumentId, text: text.trim(), createdAt: Date.now() };
  await db.questions.add(q);
  return q;
}

export const updateQuestion = (id: string, text: string) => db.questions.update(id, { text: text.trim() });
export const deleteQuestion = (id: string) => db.questions.delete(id);

export async function addCxEntry(entry: Omit<CxEntry, 'id' | 'createdAt'>): Promise<CxEntry> {
  const e: CxEntry = { ...entry, id: newId(), createdAt: Date.now() };
  await db.cx.add(e);
  return e;
}

export const updateCxEntry = (id: string, patch: Partial<Pick<CxEntry, 'question' | 'answer' | 'concession' | 'asker'>>) =>
  db.cx.update(id, patch);
export const deleteCxEntry = (id: string) => db.cx.delete(id);

/** How a crossfire concession reads when dropped onto the flow. */
export const formatConcession = (e: CxEntry) =>
  `[CX ${e.segment}] ${e.answer.trim() || e.question.trim()}`;
