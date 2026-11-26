/*
 * Service worker: caches APP FILES only. Saved games live in localStorage
 * and are never touched here, so clearing or updating this cache is safe.
 *
 * - Page (navigation): network first, cache as fallback  -> updates arrive on the next online visit.
 * - /_next/static/*: cache first (file names contain a content hash, so they never change).
 * - Other same-origin GET (icons, manifest): stale-while-revalidate.
 */
const CACHE = "sudoku16-v1";
const MAX_STATIC_ENTRIES = 200;
const PRECACHE = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (!event.data || event.data.type !== "CACHE_URLS" || !Array.isArray(event.data.urls)) return;
  const urls = event.data.urls.filter((u) => typeof u === "string" && new URL(u).origin === self.location.origin);
  event.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.all(
        urls.map((u) =>
          c.match(u).then((hit) => hit || fetch(u).then((res) => (res.ok ? c.put(u, res) : undefined)).catch(() => undefined)),
        ),
      ),
    ),
  );
});

async function trim(cache) {
  const keys = await cache.keys();
  const statics = keys.filter((r) => new URL(r.url).pathname.startsWith("/_next/static/"));
  for (const r of statics.slice(0, Math.max(0, statics.length - MAX_STATIC_ENTRIES))) await cache.delete(r);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put("/", copy));
          }
          return res;
        })
        .catch(async () => {
          const cached = (await caches.match(req)) || (await caches.match("/"));
          return (
            cached ||
            new Response("<h1>Offline</h1><p>Open Sudoku 16 once while online so it can be saved for offline play.</p>", {
              headers: { "Content-Type": "text/html; charset=utf-8" },
            })
          );
        }),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(CACHE).then(async (c) => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) {
          await c.put(req, res.clone());
          trim(c);
        }
        return res;
      }),
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE).then(async (c) => {
      const hit = await c.match(req);
      const network = fetch(req)
        .then((res) => {
          if (res.ok) c.put(req, res.clone());
          return res;
        })
        .catch(() => hit);
      return hit || network;
    }),
  );
});
