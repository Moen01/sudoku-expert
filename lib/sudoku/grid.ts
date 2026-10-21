/** Conversions and small helpers for working with boards. */

import { CELL_COUNT, SIZE, colOf, rowOf } from './constants';
import type { Grid } from './types';

/**
 * Parse an 81-char string into a {@link Grid}. Accepts `.`, `0` or space as
 * empty markers. Throws if the string is not exactly 81 valid characters.
 */
export function parseGrid(input: string): Grid {
  const trimmed = input.trim();
  if (trimmed.length !== CELL_COUNT) {
    throw new Error(`Expected ${CELL_COUNT} characters, received ${trimmed.length}`);
  }
  const grid: Grid = new Array(CELL_COUNT);
  for (let i = 0; i < CELL_COUNT; i++) {
    const ch = trimmed[i];
    if (ch === '.' || ch === '0' || ch === ' ') {
      grid[i] = 0;
    } else {
      const digit = ch.charCodeAt(0) - 48;
      if (digit < 1 || digit > 9) {
        throw new Error(`Invalid character "${ch}" at position ${i}`);
      }
      grid[i] = digit;
    }
  }
  return grid;
}

/** Serialize a grid to an 81-char string using `.` for empty cells. */
export function stringifyGrid(grid: Grid): string {
  let out = '';
  for (let i = 0; i < CELL_COUNT; i++) {
    out += grid[i] === 0 ? '.' : String(grid[i]);
  }
  return out;
}

export function cloneGrid(grid: Grid): Grid {
  return grid.slice();
}

export function emptyGrid(): Grid {
  return new Array<number>(CELL_COUNT).fill(0);
}

export function isFull(grid: Grid): boolean {
  for (let i = 0; i < CELL_COUNT; i++) {
    if (grid[i] === 0) return false;
  }
  return true;
}

/** Human-friendly cell label such as `R1C1` (1-indexed). */
export function cellLabel(cell: number): string {
  return `R${rowOf(cell) + 1}C${colOf(cell) + 1}`;
}

/** Number of filled clues in a grid. */
export function clueCount(grid: Grid): number {
  let n = 0;
  for (let i = 0; i < CELL_COUNT; i++) {
    if (grid[i] !== 0) n++;
  }
  return n;
}

export { SIZE, CELL_COUNT };
