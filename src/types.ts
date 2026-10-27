export type Side = 'PRO' | 'CON';

export const RESPONSE_KINDS = [
  'NU',
  'DELINK',
  'LINK_TURN',
  'IMPACT_TURN',
  'MITIGATION',
  'WEIGHING',
  'OTHER',
] as const;
export type ResponseKind = (typeof RESPONSE_KINDS)[number];

export const KIND_LABELS: Record<ResponseKind, string> = {
  NU: 'NU',
  DELINK: 'DL',
  LINK_TURN: 'LT',
  IMPACT_TURN: 'IT',
  MITIGATION: 'MIT',
  WEIGHING: 'WGH',
  OTHER: 'OTH',
};

export const KIND_NAMES: Record<ResponseKind, string> = {
  NU: 'Non-unique',
  DELINK: 'Delink',
  LINK_TURN: 'Link turn',
  IMPACT_TURN: 'Impact turn',
  MITIGATION: 'Mitigation',
  WEIGHING: 'Weighing',
  OTHER: 'Other',
};

export interface Resolution {
  id: string;
  title: string;
  monthRange?: string;
  createdAt: number;
}

/** An opponent argument you prep responses against. `side` is the side that runs it. */
export interface Argument {
  id: string;
  resolutionId: string;
  side: Side;
  title: string;
  summary?: string;
  createdAt: number;
}

export interface BankResponse {
  id: string;
  argumentId: string;
  kind: ResponseKind;
  isCard: boolean;
  tag: string;
  text: string;
  cite?: string;
  url?: string;
  strength: 1 | 2 | 3;
  timesUsed: number;
  createdAt: number;
}

export type JudgeType = 'LAY' | 'FLOW' | 'TECH';

export interface Round {
  id: string;
  resolutionId: string;
  tournament: string;
  roundName: string;
  ourSide: Side;
  /** 1 = our team gives the first constructive. */
  speakingOrder: 1 | 2;
  opponents: string;
  judge: string;
  judgeType: JudgeType;
  prepSeconds: number;
  createdAt: number;
}

export const SPEECHES = ['PC', 'CC', 'PR', 'CR', 'PS', 'CS', 'PFF', 'CFF'] as const;
export type Speech = (typeof SPEECHES)[number];

/** One line of argument on a flow sheet. A sheet holds one side's case. */
export interface FlowRow {
  id: string;
  roundId: string;
  sheet: Side;
  order: number;
  argumentId?: string;
}

export interface FlowCell {
  id: string;
  roundId: string;
  rowId: string;
  speech: Speech;
  text: string;
  kind?: ResponseKind;
  linkedResponseIds: string[];
}
