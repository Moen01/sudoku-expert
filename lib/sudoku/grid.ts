/**
 * Grid geometry for 9x9 (3x3 boxes) and 16x16 (4x4 boxes).
 *
 * Cells are numbered row-major. A cell value is 0 (empty) or 1..size.
 * Value v is shown as SYMBOLS[v - 1], so 10 = "A" ... 16 = "G".
 * Candidate sets are bitmasks: bit (v - 1) set means "v is possible".
 *
 * The geometry is picked from the grid length (81 or 256), so most
 * functions take a plain grid and need no size argument.
 */

export const SYMBOLS = "123456789ABCDEFG";

export type Grid = number[];
export type BoardSize = 9 | 16;

export interface Geometry {
  box: number;
  size: BoardSize;
  cells: number;
  /** Mask with all `size` candidate bits set. */
  all: number;
  /** 3*size units: rows, then columns, then boxes. */
  units: readonly (readonly number[])[];
  /** For each cell: [rowUnit, colUnit, boxUnit] indexes into units. */
  cellUnits: readonly (readonly number[])[];
  /** For each cell: the other cells that share a row, column or box. */
  peers: readonly (readonly number[])[];
  rowOf: (i: number) => number;
  colOf: (i: number) => number;
  boxOf: (i: number) => number;
}

function makeGeometry(box: 3 | 4): Geometry {
  const size = (box * box) as BoardSize;
  const cells = size * size;
  const rowOf = (i: number) => Math.floor(i / size);
  const colOf = (i: number) => i % size;
  const boxOf = (i: number) => Math.floor(rowOf(i) / box) * box + Math.floor(colOf(i) / box);

  const units: number[][] = [];
  for (let r = 0; r < size; r++) units.push(Array.from({ length: size }, (_, c) => r * size + c));
  for (let c = 0; c < size; c++) units.push(Array.from({ length: size }, (_, r) => r * size + c));
  for (let b = 0; b < size; b++) {
    const r0 = Math.floor(b / box) * box;
    const c0 = (b % box) * box;
    const unit: number[] = [];
    for (let r = 0; r < box; r++) for (let c = 0; c < box; c++) unit.push((r0 + r) * size + c0 + c);
    units.push(unit);
  }
  const cellUnits = Array.from({ length: cells }, (_, i) => [rowOf(i), size + colOf(i), 2 * size + boxOf(i)]);
  const peers = Array.from({ length: cells }, (_, i) => {
    const set = new Set<number>();
    for (const u of cellUnits[i]) for (const j of units[u]) if (j !== i) set.add(j);
    return [...set];
  });
  return { box, size, cells, all: (1 << size) - 1, units, cellUnits, peers, rowOf, colOf, boxOf };
}

export const G9 = makeGeometry(3);
export const G16 = makeGeometry(4);

export const geometryFor = (size: BoardSize): Geometry => (size === 9 ? G9 : G16);

/** Geometry from a grid (or candidate array) length. Throws on any other length. */
export function geoOf(g: ArrayLike<number>): Geometry {
  if (g.length === G9.cells) return G9;
  if (g.length === G16.cells) return G16;
  throw new Error(`Grid must have 81 or 256 cells, got ${g.length}`);
}

// Popcount for every 16-bit mask. 64 KB, built once; makes candidate counting O(1).
const POP = (() => {
  const t = new Uint8Array(1 << 16);
  for (let m = 1; m < t.length; m++) t[m] = t[m >> 1] + (m & 1);
  return t;
})();

export const popcount = (mask: number): number => POP[mask & 0xffff];
export const bit = (v: number): number => 1 << (v - 1);
/** Value (1..16) of the lowest set bit. */
export const lowestValue = (mask: number): number => 32 - Math.clz32(mask & -mask);

export function valuesOf(mask: number): number[] {
  const out: number[] = [];
  for (let v = 1; v <= 16; v++) if (mask & bit(v)) out.push(v);
  return out;
}

export const symbolOf = (v: number): string => (v >= 1 && v <= 16 ? SYMBOLS[v - 1] : ".");

/** Map a typed key ("1".."9", "a".."g", case-insensitive) to 1..16, or null. Callers check it fits the board. */
export function valueFromKey(key: string): number | null {
  if (key.length !== 1) return null;
  const idx = SYMBOLS.indexOf(key.toUpperCase());
  return idx >= 0 ? idx + 1 : null;
}

/** "row 3, column 12" (1-based) for hint messages. */
export const cellName = (i: number, size: BoardSize): string =>
  `row ${Math.floor(i / size) + 1}, column ${(i % size) + 1}`;

export function parseGrid(s: string): Grid {
  const geo = geoOf({ length: s.length });
  return [...s].map((ch) => {
    if (ch === "." || ch === "0") return 0;
    const v = SYMBOLS.indexOf(ch.toUpperCase()) + 1;
    if (v < 1 || v > geo.size) throw new Error(`Invalid grid character "${ch}"`);
    return v;
  });
}

export const serializeGrid = (g: Grid): string => g.map(symbolOf).join("");
