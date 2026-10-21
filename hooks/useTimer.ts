import { useEffect } from 'react';

/**
 * Drives the game clock. Ticks only while `active` and the tab is visible, so
 * time spent with the app backgrounded or closed is never counted. Deltas are
 * measured against the wall clock to stay accurate even if the interval is
 * throttled by the browser.
 */
export function useTimer(active: boolean, onTick: (deltaMs: number) => void): void {
  useEffect(() => {
    if (!active) return;
    let last = Date.now();

    const tick = (): void => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        last = Date.now();
        return;
      }
      const now = Date.now();
      onTick(now - last);
      last = now;
    };

    const interval = window.setInterval(tick, 500);
    const resume = (): void => {
      last = Date.now();
    };
    document.addEventListener('visibilitychange', resume);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [active, onTick]);
}
