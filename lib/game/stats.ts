import { DIFFICULTY_ORDER, type Difficulty } from "@/lib/sudoku/difficulty";
import type { DifficultyStats, Stats } from "./types";

const MAX_RECENT = 20;

export const emptyDifficultyStats = (): DifficultyStats => ({
  started: 0,
  completed: 0,
  bestMs: null,
  totalMs: 0,
  currentStreak: 0,
  longestStreak: 0,
  recent: [],
});

export const emptyStats = (): Stats =>
  Object.fromEntries(DIFFICULTY_ORDER.map((d) => [d, emptyDifficultyStats()])) as Stats;

const update = (stats: Stats, d: Difficulty, fn: (s: DifficultyStats) => DifficultyStats): Stats => ({
  ...stats,
  [d]: fn(stats[d]),
});

export const recordStart = (stats: Stats, d: Difficulty): Stats =>
  update(stats, d, (s) => ({ ...s, started: s.started + 1 }));

/** Solved without revealing the solution. Hints are allowed and do not break the streak. */
export function recordWin(stats: Stats, d: Difficulty, ms: number, id: string, mistakes: number, at: number): Stats {
  return update(stats, d, (s) => {
    const currentStreak = s.currentStreak + 1;
    return {
      ...s,
      completed: s.completed + 1,
      bestMs: s.bestMs === null ? ms : Math.min(s.bestMs, ms),
      totalMs: s.totalMs + ms,
      currentStreak,
      longestStreak: Math.max(s.longestStreak, currentStreak),
      recent: [{ ms, at, id, mistakes }, ...s.recent].slice(0, MAX_RECENT),
    };
  });
}

/** Revealed the solution, or left a started game for a new one. Time still counts as played. */
export const recordLoss = (stats: Stats, d: Difficulty, ms: number): Stats =>
  update(stats, d, (s) => ({ ...s, currentStreak: 0, totalMs: s.totalMs + ms }));
