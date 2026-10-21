'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker that caches the app shell for offline play.
 * Registration is a progressive enhancement — the game works without it.
 */
export function ServiceWorkerRegister(): null {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const register = (): void => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* Registration failures are non-fatal. */
      });
    };
    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
    }
  }, []);

  return null;
}
