import type { Difficulty } from "./difficulty";
import { geoOf, parseGrid, type Grid } from "./grid";
import { makeRng, solve } from "./solver";
import { applyTransform, randomTransform } from "./transform";
import { puzzleMatchesSolution } from "./validate";

export interface BankEntry {
  id: string;
  /** 81 or 256 chars, "." = empty, "1".."9","A".."G" = givens. */
  puzzle: string;
  clues: number;
  tier: number;
  score: number;
}

export interface PuzzleBank {
  version: number;
  generatedAt: string;
  puzzles: Record<Difficulty, BankEntry[]>;
}

export interface PreparedPuzzle {
  /** Bank id + transform seed, e.g. "E007-1a2b3c4d". Unique per game in practice. */
  id: string;
  difficulty: Difficulty;
  puzzle: Grid;
  solution: Grid;
  bankId: string;
  seed: number;
  clues: number;
  tier: number;
  score: number;
}

/**
 * Turn a bank entry into a playable puzzle: apply a random symmetry,
 * then solve it and re-check uniqueness before the player sees it.
 * Throws if anything is wrong, so a bad board is never shown.
 */
export function preparePuzzle(entry: BankEntry, difficulty: Difficulty, seed: number): PreparedPuzzle {
  const base = parseGrid(entry.puzzle);
  const puzzle = applyTransform(base, randomTransform(makeRng(seed), geoOf(base)));
  const result = solve(puzzle, { limit: 2, maxNodes: 2_000_000 });
  if (result.aborted || result.count !== 1 || !result.solution) {
    throw new Error(`Bank puzzle ${entry.id} is not uniquely solvable`);
  }
  if (!puzzleMatchesSolution(puzzle, result.solution)) {
    throw new Error(`Bank puzzle ${entry.id} failed validation`);
  }
  return {
    id: `${entry.id}-${(seed >>> 0).toString(16).padStart(8, "0")}`,
    difficulty,
    puzzle,
    solution: result.solution,
    bankId: entry.id,
    seed,
    clues: entry.clues,
    tier: entry.tier,
    score: entry.score,
  };
}

/** Prefer bank entries the player has not seen recently. */
export function pickEntry(entries: BankEntry[], recentBankIds: readonly string[], rng: () => number): BankEntry {
  if (entries.length === 0) throw new Error("Puzzle bank is empty");
  const recent = new Set(recentBankIds);
  const fresh = entries.filter((e) => !recent.has(e.id));
  const pool = fresh.length ? fresh : entries;
  return pool[Math.floor(rng() * pool.length)];
}

let bankPromise: Promise<PuzzleBank> | null = null;

/** Lazy-load the bank (separate JS chunk, cached by the service worker for offline use). */
export function loadBank(): Promise<PuzzleBank> {
  bankPromise ??= import("./bank.json").then((m) => m.default as PuzzleBank);
  return bankPromise;
}
