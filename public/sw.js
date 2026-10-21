/*
 * Service worker for Sudoku Expert.
 *
 * Responsibility: cache the application shell and static assets so the game
 * loads and plays fully offline. It deliberately NEVER touches localStorage —
 * saved games, stats and the puzzle queue live there and are owned by the app,
 * completely separate from this HTTP cache. Bump CACHE_VERSION to invalidate
 * old asset caches when shipping a breaking change.
 */

const CACHE_VERSION = 'v1';
const SHELL_CACHE = `sudoku-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `sudoku-runtime-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await cache.addAll(PRECACHE_URLS);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== SHELL_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

function isCacheableAsset(url) {
  return (
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/icons/') ||
    /\.(?:js|css|json|woff2?|png|svg|webmanifest)$/.test(url.pathname)
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // ignore cross-origin

  // Navigations: network-first so updates land immediately, with an offline
  // fallback to the cached shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const network = await fetch(request);
          const cache = await caches.open(SHELL_CACHE);
          cache.put('/', network.clone()).catch(() => {});
          return network;
        } catch {
          const cache = await caches.open(SHELL_CACHE);
          return (
            (await cache.match('/')) ||
            (await cache.match('/offline.html')) ||
            Response.error()
          );
        }
      })(),
    );
    return;
  }

  // Static assets: cache-first, filling the runtime cache on demand.
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      try {
        const network = await fetch(request);
        if (network.ok && isCacheableAsset(url)) {
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(request, network.clone());
        }
        return network;
      } catch {
        return cached || Response.error();
      }
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
