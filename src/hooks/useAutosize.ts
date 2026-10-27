import { type RefObject, useLayoutEffect } from 'react';

/** Grow a textarea to fit its content whenever any of `deps` change. */
export function useAutosize(ref: RefObject<HTMLTextAreaElement | null>, deps: unknown[]) {
  useLayoutEffect(() => {
    const t = ref.current;
    if (!t) return;
    t.style.height = 'auto';
    t.style.height = `${t.scrollHeight}px`;
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}
