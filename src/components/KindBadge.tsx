import { KIND_LABELS, KIND_NAMES, type ResponseKind } from '../types';

// Fixed hues so a type always reads the same, whatever the theme color.
const HUES: Record<ResponseKind, number> = {
  NU: 75,
  DELINK: 230,
  LINK_TURN: 20,
  IMPACT_TURN: 330,
  MITIGATION: 155,
  WEIGHING: 290,
  OTHER: 260,
};

export function KindBadge({ kind, className = '' }: { kind: ResponseKind; className?: string }) {
  const h = HUES[kind];
  const c = kind === 'OTHER' ? 0.02 : 0.14;
  return (
    <span
      title={KIND_NAMES[kind]}
      className={`inline-flex h-[1.15rem] shrink-0 items-center rounded px-1.5 font-mono text-[0.62rem] font-bold tracking-wide ${className}`}
      style={{
        color: `light-dark(oklch(0.45 ${c} ${h}), oklch(0.85 ${c} ${h}))`,
        background: `light-dark(oklch(0.93 ${c / 2.5} ${h}), oklch(0.35 ${c / 1.6} ${h} / 0.6))`,
      }}
    >
      {KIND_LABELS[kind]}
    </span>
  );
}
