import { KIND_LABELS, KIND_NAMES, type ResponseKind } from '../types';

const COLORS: Record<ResponseKind, string> = {
  NU: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200',
  DELINK: 'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200',
  LINK_TURN: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200',
  IMPACT_TURN: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/60 dark:text-fuchsia-200',
  MITIGATION: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200',
  WEIGHING: 'bg-violet-100 text-violet-800 dark:bg-violet-900/60 dark:text-violet-200',
  OTHER: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
};

export function KindBadge({ kind }: { kind: ResponseKind }) {
  return (
    <span title={KIND_NAMES[kind]} className={`shrink-0 rounded px-1.5 py-0.5 text-[0.65rem] font-bold ${COLORS[kind]}`}>
      {KIND_LABELS[kind]}
    </span>
  );
}
