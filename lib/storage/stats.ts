/** Local, device-only statistics. */

import { StorageKeys, readJSON, writeJSON } from './storage';

export interface Stats {
  version: number;
  completed: number;
  bestMs: number | null;
  totalMs: number;
  currentStreak: number;
  longestStreak: number;
  /** Most recent completion times (newest last), capped. */
  times: number[];
  lastCompletedAt: number | null;
}

const STATS_VERSION = 1;
const MAX_TIMES = 100;

export function defaultStats(): Stats {
  return {
    version: STATS_VERSION,
    completed: 0,
    bestMs: null,
    totalMs: 0,
    currentStreak: 0,
    longestStreak: 0,
    times: [],
    lastCompletedAt: null,
  };
}

export function loadStats(): Stats {
  const stored = readJSON<Stats>(StorageKeys.stats);
  if (
    !stored ||
    typeof stored.completed !== 'number' ||
    stored.version !== STATS_VERSION ||
    !Array.isArray(stored.times)
  ) {
    return defaultStats();
  }
  return stored;
}

export function saveStats(stats: Stats): void {
  writeJSON(StorageKeys.stats, stats);
}

/**
 * Record a legitimately completed puzzle. `usedHelp` (hint-assisted) still
 * counts as a win and keeps the streak, matching typical casual play.
 */
export function recordCompletion(prev: Stats, elapsedMs: number): Stats {
  const currentStreak = prev.currentStreak + 1;
  const next: Stats = {
    ...prev,
    completed: prev.completed + 1,
    bestMs: prev.bestMs === null ? elapsedMs : Math.min(prev.bestMs, elapsedMs),
    totalMs: prev.totalMs + elapsedMs,
    currentStreak,
    longestStreak: Math.max(prev.longestStreak, currentStreak),
    times: [...prev.times, elapsedMs].slice(-MAX_TIMES),
    lastCompletedAt: Date.now(),
  };
  saveStats(next);
  return next;
}

/** Revealing the solution ends the current streak but is not a completion. */
export function recordReveal(prev: Stats): Stats {
  const next: Stats = { ...prev, currentStreak: 0 };
  saveStats(next);
  return next;
}
