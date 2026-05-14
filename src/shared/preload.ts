// Defer a preload-side-effect to the browser's first idle window so the
// initial paint (Home screen) isn't competing with model fetches that won't
// be needed until Battle / Codex. Falls back to a short setTimeout when
// requestIdleCallback isn't available (Safari).
type IdleApi = (cb: () => void, opts?: { timeout?: number }) => number;

export function schedulePreload(fn: () => void): void {
  if (typeof window === "undefined") {
    return;
  }
  const ric = (window as Window & { requestIdleCallback?: IdleApi }).requestIdleCallback;
  if (ric) {
    ric(() => fn(), { timeout: 2500 });
  } else {
    window.setTimeout(fn, 600);
  }
}
