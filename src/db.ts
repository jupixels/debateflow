import Dexie, { type EntityTable } from 'dexie';
import type {
  Argument,
  BankResponse,
  Case,
  CaseSection,
  CxEntry,
  CxQuestion,
  FlowCell,
  FlowRow,
  Resolution,
  Round,
} from './types';

export class FlowDB extends Dexie {
  resolutions!: EntityTable<Resolution, 'id'>;
  args!: EntityTable<Argument, 'id'>;
  responses!: EntityTable<BankResponse, 'id'>;
  rounds!: EntityTable<Round, 'id'>;
  rows!: EntityTable<FlowRow, 'id'>;
  cells!: EntityTable<FlowCell, 'id'>;
  questions!: EntityTable<CxQuestion, 'id'>;
  cx!: EntityTable<CxEntry, 'id'>;
  cases!: EntityTable<Case, 'id'>;
  sections!: EntityTable<CaseSection, 'id'>;

  constructor(name = 'rebuttal-flow') {
    super(name);
    this.version(1).stores({
      resolutions: 'id, createdAt',
      args: 'id, resolutionId, side',
      responses: 'id, argumentId, kind',
      rounds: 'id, resolutionId, createdAt',
      rows: 'id, roundId, [roundId+sheet]',
      cells: 'id, roundId, rowId, [rowId+speech]',
    });
    this.version(2).stores({
      questions: 'id, argumentId',
      cx: 'id, roundId',
    });
    this.version(3).stores({
      args: 'id, resolutionId, side, caseId',
      cases: 'id, resolutionId',
      sections: 'id, caseId',
    });
  }
}

export const db = new FlowDB();

export const newId = (): string => crypto.randomUUID();
