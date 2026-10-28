/** How long after opening the app an update may be applied without asking. */
export const AUTO_UPDATE_WINDOW_MS = 20_000;

/**
 * Apply a new version straight away if the app was only just opened and no
 * clock is running: nothing can be interrupted. Otherwise ask first.
 */
export function shouldAutoUpdate(sinceLoadMs: number, clockRunning: boolean): boolean {
  return sinceLoadMs < AUTO_UPDATE_WINDOW_MS && !clockRunning;
}
