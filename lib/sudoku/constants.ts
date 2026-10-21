/**
 * Precomputed Sudoku geometry: units (rows, columns, boxes) and peer sets.
 *
 * These tables are built once at module load and shared by the solver,
 * generator and UI so the hot paths never recompute index arithmetic.
 */

export const SIZE = 9;
export const CELL_COUNT = 81;

/** Bitmask with all nine digits set (bits 0‑8). */
export const ALL_DIGITS_MASK = 0b111111111;

export const rowOf = (cell: number): number => Math.floor(cell / SIZE);
export const colOf = (cell: number): number => cell % SIZE;
export const boxOf = (cell: number): number =>
  Math.floor(rowOf(cell) / 3) * 3 + Math.floor(colOf(cell) / 3);

/** Bit for a digit 1‑9. */
export const bit = (digit: number): number => 1 << (digit - 1);

/** Count set bits in a 9-bit mask. */
export const popCount = (mask: number): number => {
  let count = 0;
  let m = mask;
  while (m) {
    m &= m - 1;
    count++;
  }
  return count;
};

/** List the digits (1‑9) present in a mask. */
export const digitsFromMask = (mask: number): number[] => {
  const digits: number[] = [];
  for (let d = 1; d <= SIZE; d++) {
    if (mask & bit(d)) digits.push(d);
  }
  return digits;
};

const buildRows = (): number[][] => {
  const rows: number[][] = [];
  for (let r = 0; r < SIZE; r++) {
    const unit: number[] = [];
    for (let c = 0; c < SIZE; c++) unit.push(r * SIZE + c);
    rows.push(unit);
  }
  return rows;
};

const buildCols = (): number[][] => {
  const cols: number[][] = [];
  for (let c = 0; c < SIZE; c++) {
    const unit: number[] = [];
    for (let r = 0; r < SIZE; r++) unit.push(r * SIZE + c);
    cols.push(unit);
  }
  return cols;
};

const buildBoxes = (): number[][] => {
  const boxes: number[][] = Array.from({ length: SIZE }, () => []);
  for (let cell = 0; cell < CELL_COUNT; cell++) {
    boxes[boxOf(cell)].push(cell);
  }
  return boxes;
};

export const ROWS: readonly number[][] = buildRows();
export const COLS: readonly number[][] = buildCols();
export const BOXES: readonly number[][] = buildBoxes();

/** All 27 units (9 rows, 9 columns, 9 boxes). */
export const UNITS: readonly number[][] = [...ROWS, ...COLS, ...BOXES];

/** For each cell, the three units (row, col, box) it belongs to. */
export const UNITS_OF_CELL: readonly number[][][] = (() => {
  const result: number[][][] = Array.from({ length: CELL_COUNT }, () => []);
  for (const unit of UNITS) {
    for (const cell of unit) {
      result[cell].push(unit);
    }
  }
  return result;
})();

/** For each cell, the 20 peer cells sharing a row, column or box. */
export const PEERS: readonly number[][] = (() => {
  const result: number[][] = Array.from({ length: CELL_COUNT }, () => []);
  for (let cell = 0; cell < CELL_COUNT; cell++) {
    const peers = new Set<number>();
    for (const unit of UNITS_OF_CELL[cell]) {
      for (const other of unit) {
        if (other !== cell) peers.add(other);
      }
    }
    result[cell] = [...peers];
  }
  return result;
})();
