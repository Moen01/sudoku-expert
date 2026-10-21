/**
 * Backtracking solver with bitmask constraint tracking and MRV (minimum
 * remaining values) cell selection. Used both to solve puzzles and to count
 * solutions for uniqueness checks during generation.
 */

import {
  ALL_DIGITS_MASK,
  CELL_COUNT,
  SIZE,
  bit,
  boxOf,
  colOf,
  popCount,
  rowOf,
} from './constants';
import { cloneGrid, isFull } from './grid';
import { isLegalConfiguration } from './validation';
import type { Grid } from './types';

interface SolverState {
  grid: Grid;
  rowMask: number[];
  colMask: number[];
  boxMask: number[];
}

function createState(grid: Grid): SolverState {
  const rowMask = new Array<number>(SIZE).fill(0);
  const colMask = new Array<number>(SIZE).fill(0);
  const boxMask = new Array<number>(SIZE).fill(0);
  for (let cell = 0; cell < CELL_COUNT; cell++) {
    const digit = grid[cell];
    if (digit === 0) continue;
    const b = bit(digit);
    rowMask[rowOf(cell)] |= b;
    colMask[colOf(cell)] |= b;
    boxMask[boxOf(cell)] |= b;
  }
  return { grid: cloneGrid(grid), rowMask, colMask, boxMask };
}

function candidateMask(state: SolverState, cell: number): number {
  return (
    ALL_DIGITS_MASK &
    ~(state.rowMask[rowOf(cell)] | state.colMask[colOf(cell)] | state.boxMask[boxOf(cell)])
  );
}

/** Pick the empty cell with the fewest candidates; returns -1 when full. */
function selectCell(state: SolverState): { cell: number; mask: number } | null {
  let best = -1;
  let bestMask = 0;
  let bestCount = SIZE + 1;
  for (let cell = 0; cell < CELL_COUNT; cell++) {
    if (state.grid[cell] !== 0) continue;
    const mask = candidateMask(state, cell);
    const count = popCount(mask);
    if (count === 0) return { cell, mask: 0 }; // dead end
    if (count < bestCount) {
      bestCount = count;
      best = cell;
      bestMask = mask;
      if (count === 1) break;
    }
  }
  return best === -1 ? null : { cell: best, mask: bestMask };
}

function place(state: SolverState, cell: number, digit: number): void {
  const b = bit(digit);
  state.grid[cell] = digit;
  state.rowMask[rowOf(cell)] |= b;
  state.colMask[colOf(cell)] |= b;
  state.boxMask[boxOf(cell)] |= b;
}

function unplace(state: SolverState, cell: number, digit: number): void {
  const b = bit(digit);
  state.grid[cell] = 0;
  state.rowMask[rowOf(cell)] &= ~b;
  state.colMask[colOf(cell)] &= ~b;
  state.boxMask[boxOf(cell)] &= ~b;
}

/**
 * Count solutions up to `limit`. Returns as soon as the limit is reached, so
 * `countSolutions(grid, 2) === 1` is an efficient uniqueness test.
 * `randomize` shuffles digit order (used by the generator to vary solutions).
 */
export function countSolutions(grid: Grid, limit = 2, randomize = false): number {
  if (!isLegalConfiguration(grid)) return 0;
  const state = createState(grid);
  let found = 0;

  const recurse = (): void => {
    if (found >= limit) return;
    const selection = selectCell(state);
    if (selection === null) {
      found++;
      return;
    }
    const { cell, mask } = selection;
    if (mask === 0) return;
    const digits = orderDigits(mask, randomize);
    for (const digit of digits) {
      place(state, cell, digit);
      recurse();
      unplace(state, cell, digit);
      if (found >= limit) return;
    }
  };

  recurse();
  return found;
}

function orderDigits(mask: number, randomize: boolean): number[] {
  const digits: number[] = [];
  for (let d = 1; d <= SIZE; d++) {
    if (mask & bit(d)) digits.push(d);
  }
  if (randomize) {
    for (let i = digits.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [digits[i], digits[j]] = [digits[j], digits[i]];
    }
  }
  return digits;
}

/** Solve a puzzle, returning the first solution found or `null`. */
export function solve(grid: Grid, randomize = false): Grid | null {
  if (!isLegalConfiguration(grid)) return null;
  const state = createState(grid);

  const recurse = (): boolean => {
    const selection = selectCell(state);
    if (selection === null) return true;
    const { cell, mask } = selection;
    if (mask === 0) return false;
    for (const digit of orderDigits(mask, randomize)) {
      place(state, cell, digit);
      if (recurse()) return true;
      unplace(state, cell, digit);
    }
    return false;
  };

  return recurse() ? state.grid : null;
}

export function hasUniqueSolution(grid: Grid): boolean {
  return countSolutions(grid, 2) === 1;
}

/** True when the puzzle is legal, solvable and has exactly one solution. */
export function isWellFormedPuzzle(grid: Grid): boolean {
  if (!isLegalConfiguration(grid)) return false;
  if (isFull(grid)) return false;
  return countSolutions(grid, 2) === 1;
}
