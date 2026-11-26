import { geoOf, type Geometry, type Grid } from "./grid";
import { shuffle } from "./solver";

/**
 * Sudoku symmetries: relabel symbols, shuffle bands/stacks, shuffle rows
 * inside a band and columns inside a stack, optionally transpose.
 * They keep every rule, the unique solution and the logical difficulty,
 * so one validated bank puzzle yields billions of distinct-looking puzzles.
 */
export interface Transform {
  symbols: number[]; // symbols[v - 1] = new value for v
  rows: number[]; // new row r takes old row rows[r]
  cols: number[];
  transpose: boolean;
}

function lineOrder(rng: () => number, box: number): number[] {
  const bands = shuffle([...Array(box).keys()], rng);
  const out: number[] = [];
  for (const b of bands) for (const r of shuffle([...Array(box).keys()], rng)) out.push(b * box + r);
  return out;
}

export function randomTransform(rng: () => number, geo: Geometry): Transform {
  return {
    symbols: shuffle(
      Array.from({ length: geo.size }, (_, k) => k + 1),
      rng,
    ),
    rows: lineOrder(rng, geo.box),
    cols: lineOrder(rng, geo.box),
    transpose: rng() < 0.5,
  };
}

export function applyTransform(g: Grid, t: Transform): Grid {
  const { size, cells } = geoOf(g);
  if (t.symbols.length !== size) throw new Error("Transform does not fit this grid size");
  const out = new Array<number>(cells).fill(0);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const src = t.rows[r] * size + t.cols[c];
      const v = g[src];
      const dst = t.transpose ? c * size + r : r * size + c;
      out[dst] = v ? t.symbols[v - 1] : 0;
    }
  }
  return out;
}
