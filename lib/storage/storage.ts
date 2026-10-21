/**
 * Low-level, versioned localStorage access.
 *
 * All game data lives under a single versioned namespace so a future breaking
 * change can bump {@link STORAGE_VERSION} without colliding with old data.
 * Every read is defensive: malformed or unavailable storage yields `null`
 * rather than throwing, so the app degrades gracefully instead of crashing.
 */

export const STORAGE_VERSION = 1;
const PREFIX = 'sudoku-expert';

export const StorageKeys = {
  game: `${PREFIX}:v${STORAGE_VERSION}:game`,
  stats: `${PREFIX}:v${STORAGE_VERSION}:stats`,
  queue: `${PREFIX}:v${STORAGE_VERSION}:queue`,
  used: `${PREFIX}:v${STORAGE_VERSION}:used`,
  prefs: `${PREFIX}:v${STORAGE_VERSION}:prefs`,
} as const;

export function isStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const probe = `${PREFIX}:probe`;
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function readJSON<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeJSON(key: string, value: unknown): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    // Quota exceeded or storage disabled — treat as a non-fatal no-op.
    return false;
  }
}

export function removeKey(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Remove every key owned by this app (used when recovering from corruption). */
export function clearAll(): void {
  if (typeof window === 'undefined') return;
  for (const key of Object.values(StorageKeys)) removeKey(key);
}
