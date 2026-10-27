import { useRef } from 'react';
import { MAX_CHROMA, accentCss, accentToWheel, wheelToAccent } from '../lib/theme';
import type { Accent } from '../store';

const HUE_STOPS = Array.from({ length: 13 }, (_, i) => `oklch(0.7 ${MAX_CHROMA} ${i * 30})`).join(', ');

/**
 * Hue around the rim, intensity from the center (gray) out to the edge (vivid).
 * Drag, click, or use arrow keys (←/→ hue, ↑/↓ intensity).
 */
export function ColorWheel({ value, onChange, size = 184 }: { value: Accent; onChange: (a: Accent) => void; size?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  const pick = (clientX: number, clientY: number) => {
    const r = ref.current!.getBoundingClientRect();
    const half = r.width / 2;
    onChange(wheelToAccent((clientX - r.left - half) / half, (clientY - r.top - half) / half));
  };

  const { x, y } = accentToWheel(value);
  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label="Accent color"
      aria-valuetext={`Hue ${value.h}°, intensity ${Math.round((value.c / MAX_CHROMA) * 100)}%`}
      className="relative shrink-0 cursor-crosshair touch-none rounded-full shadow-card"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle closest-side, oklch(0.7 0 0), transparent), conic-gradient(${HUE_STOPS})`,
      }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        pick(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => e.buttons && pick(e.clientX, e.clientY)}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 15 : 3;
        const d: Record<string, Partial<Accent>> = {
          ArrowLeft: { h: (value.h - step + 360) % 360 },
          ArrowRight: { h: (value.h + step) % 360 },
          ArrowUp: { c: Math.min(MAX_CHROMA, value.c + 0.01) },
          ArrowDown: { c: Math.max(0, value.c - 0.01) },
        };
        if (d[e.key]) {
          e.preventDefault();
          onChange({ ...value, ...d[e.key] });
        }
      }}
    >
      <span
        className="pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-[0_0_0_1px_rgb(0_0_0/0.25),0_2px_6px_rgb(0_0_0/0.35)]"
        style={{ left: `${50 + x * 50}%`, top: `${50 + y * 50}%`, background: accentCss(value, 0.7) }}
      />
    </div>
  );
}
