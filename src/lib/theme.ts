import type { Accent, ThemeMode } from '../store';

export const ACCENT_PRESETS: { name: string; accent: Accent }[] = [
  { name: 'Blue', accent: { h: 250, c: 0.16 } },
  { name: 'Violet', accent: { h: 290, c: 0.17 } },
  { name: 'Pink', accent: { h: 350, c: 0.17 } },
  { name: 'Red', accent: { h: 25, c: 0.18 } },
  { name: 'Orange', accent: { h: 55, c: 0.16 } },
  { name: 'Green', accent: { h: 150, c: 0.15 } },
  { name: 'Teal', accent: { h: 190, c: 0.12 } },
  { name: 'Graphite', accent: { h: 260, c: 0.02 } },
];

export const MAX_CHROMA = 0.22;

export const accentCss = ({ h, c }: Accent, l = 0.68) => `oklch(${l} ${c.toFixed(3)} ${Math.round(h)})`;

/** Convert a point on the color wheel (relative to its center, radius-normalised) to an accent. */
export function wheelToAccent(dx: number, dy: number): Accent {
  // 0° hue at 12 o'clock, increasing clockwise, to match the drawn gradient.
  const angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
  const h = (angle + 360) % 360;
  const r = Math.min(1, Math.hypot(dx, dy));
  return { h: Math.round(h), c: Math.round(r * MAX_CHROMA * 1000) / 1000 };
}

/** Inverse of wheelToAccent: where the handle sits, as fractions of the radius. */
export function accentToWheel({ h, c }: Accent): { x: number; y: number } {
  const r = Math.min(1, c / MAX_CHROMA);
  const rad = (h * Math.PI) / 180;
  return { x: Math.sin(rad) * r, y: -Math.cos(rad) * r };
}

export function resolveDark(mode: ThemeMode): boolean {
  if (mode === 'system') return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
  return mode === 'dark';
}

export function applyTheme(mode: ThemeMode, accent: Accent, flowFontSize: number) {
  const root = document.documentElement;
  const dark = resolveDark(mode);
  root.classList.toggle('dark', dark);
  root.style.setProperty('--accent-h', String(accent.h));
  root.style.setProperty('--accent-c', String(accent.c));
  root.style.setProperty('--flow-font', `${flowFontSize}px`);
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute('content', getComputedStyle(root).getPropertyValue('--surface').trim() || (dark ? '#111' : '#fff'));
}
