/**
 * Puzzle generation.
 *
 * Strategy:
 *   1. Build a random complete solution via randomized backtracking.
 *   2. Remove clues one at a time, keeping a clue only if the puzzle still has
 *      a unique solution (minimal-dig). Minimal puzzles tend to be hard.
 *   3. Grade the result with the logical solver and accept it only if it meets
 *      the requested difficulty band and is fully solvable by logic (so hints
 *      can always explain a move).
 */

import { CELL_COUNT } from './constants';
import { cloneGrid, emptyGrid, stringifyGrid } from './grid';
import { bandAtLeast, gradePuzzle } from './logicalSolver';
import { countSolutions, solve } from './solver';
import type { DifficultyBand, Grid, PuzzleRecord } from './types';

/** Deterministic short id derived from the puzzle string (FNV-1a). */
export function puzzleId(puzzle: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < puzzle.length; i++) {
    hash ^= puzzle.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/** Generate a random, fully solved board. */
export function generateSolution(): Grid {
  const solution = solve(emptyGrid(), true);
  if (!solution) {
    // Unreachable for an empty grid, but keep the type honest.
    throw new Error('Failed to generate a solution grid');
  }
  return solution;
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Remove clues while preserving a unique solution. */
export function digHoles(solution: Grid): Grid {
  const puzzle = cloneGrid(solution);
  const order = shuffle(Array.from({ length: CELL_COUNT }, (_, i) => i));
  for (const pos of order) {
    const backup = puzzle[pos];
    if (backup === 0) continue;
    puzzle[pos] = 0;
    if (countSolutions(puzzle, 2) !== 1) {
      puzzle[pos] = backup; // removal broke uniqueness — keep the clue
    }
  }
  return puzzle;
}

export interface GenerateOptions {
  minBand?: DifficultyBand;
  maxAttempts?: number;
}

/**
 * Generate one validated puzzle meeting `minBand` (default `extreme`). Returns
 * `null` if no qualifying puzzle was produced within `maxAttempts`.
 */
export function generatePuzzle(options: GenerateOptions = {}): PuzzleRecord | null {
  const minBand = options.minBand ?? 'extreme';
  const maxAttempts = options.maxAttempts ?? 80;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const solution = generateSolution();
    const puzzle = digHoles(solution);
    const report = gradePuzzle(puzzle);
    if (report.solved && bandAtLeast(report.band, minBand)) {
      const puzzleStr = stringifyGrid(puzzle);
      return {
        id: puzzleId(puzzleStr),
        puzzle: puzzleStr,
        solution: stringifyGrid(solution),
        difficulty: {
          band: report.band,
          score: report.score,
          hardestTechnique: report.hardestTechnique,
        },
        source: 'generated',
      };
    }
  }
  return null;
}
