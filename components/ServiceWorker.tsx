"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js in production and hands it the URLs this page already
 * loaded (JS chunks, CSS, the puzzle bank chunk). Those were fetched before
 * the worker existed, so without this the first offline visit would fail.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;
        const urls = [
          location.href,
          ...performance
            .getEntriesByType("resource")
            .map((e) => e.name)
            .filter((u) => u.startsWith(location.origin)),
        ];
        (reg.active ?? navigator.serviceWorker.controller)?.postMessage({ type: "CACHE_URLS", urls });
      } catch (err) {
        console.warn("Service worker registration failed", err);
      }
    };
    // Wait for load so the worker does not compete with the first paint.
    if (document.readyState === "complete") void register();
    else window.addEventListener("load", () => void register(), { once: true });
  }, []);
  return null;
}
