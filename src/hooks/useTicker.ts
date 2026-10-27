import { useEffect, useReducer } from 'react';

/**
 * Re-render every `ms` while `active`. Callers read Date.now() during render,
 * so the displayed time is never older than the state it is compared with.
 */
export function useTicker(active: boolean, ms = 200, onTick?: (now: number) => void) {
  const [, force] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => {
      onTick?.(Date.now());
      force();
    }, ms);
    return () => clearInterval(t);
  }, [active, ms, onTick]);
}
