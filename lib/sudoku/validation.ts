/** Validation of boards, solutions and puzzle configurations. */

import { CELL_COUNT, PEERS, UNITS } from './constants';
import { isFull } from './grid';
import type { Grid } from './types';

/**
 * A grid is a legal configuration when no filled digit repeats within any
 * row, column or box. Empty cells are ignored.
 */
export function isLegalConfiguration(grid: Grid): boolean {
  if (grid.length !== CELL_COUNT) return false;
  for (const unit of UNITS) {
    let seen = 0;
    for (const cell of unit) {
      const digit = grid[cell];
      if (digit === 0) continue;
      if (digit < 1 || digit > 9) return false;
      const mask = 1 << digit;
      if (seen & mask) return false;
      seen |= mask;
    }
  }
  return true;
}

/** True when `grid` is completely filled and satisfies every Sudoku constraint. */
export function isValidSolution(grid: Grid): boolean {
  if (!isFull(grid)) return false;
  for (const unit of UNITS) {
    let seen = 0;
    for (const cell of unit) {
      const digit = grid[cell];
      if (digit < 1 || digit > 9) return false;
      const mask = 1 << digit;
      if (seen & mask) return false;
      seen |= mask;
    }
    if (seen !== 0b1111111110) return false; // digits 1‑9 exactly once
  }
  return true;
}

/** True when `candidate` is a valid solution consistent with the puzzle clues. */
export function solutionMatchesPuzzle(puzzle: Grid, candidate: Grid): boolean {
  if (!isValidSolution(candidate)) return false;
  for (let i = 0; i < CELL_COUNT; i++) {
    if (puzzle[i] !== 0 && puzzle[i] !== candidate[i]) return false;
  }
  return true;
}

/** Set of cells whose value conflicts with a filled peer (used for UI feedback). */
export function findConflicts(grid: Grid): Set<number> {
  const conflicts = new Set<number>();
  for (let cell = 0; cell < CELL_COUNT; cell++) {
    const digit = grid[cell];
    if (digit === 0) continue;
    for (const peer of PEERS[cell]) {
      if (grid[peer] === digit) {
        conflicts.add(cell);
        conflicts.add(peer);
      }
    }
  }
  return conflicts;
}
