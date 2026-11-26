import { bit, geoOf, lowestValue, popcount, type Geometry, type Grid } from "./grid";

/**
 * Backtracking solver with constraint propagation.
 *
 * Every assignment removes the digit from all peers (naked singles cascade)
 * and checks each unit for a digit with only one place left (hidden singles).
 * The search then branches on the cell with the fewest candidates.
 * This is fast enough to prove uniqueness of 9x9 and 16x16 puzzles in milliseconds.
 */

function assign(g: Geometry, c: Uint16Array, i: number, b: number): boolean {
  let other = c[i] & ~b;
  while (other) {
    const lb = other & -other;
    other &= ~lb;
    if (!eliminate(g, c, i, lb)) return false;
  }
  return true;
}

function eliminate(g: Geometry, c: Uint16Array, i: number, b: number): boolean {
  if (!(c[i] & b)) return true;
  c[i] &= ~b;
  const rest = c[i];
  if (rest === 0) return false;
  if (popcount(rest) === 1) {
    for (const p of g.peers[i]) if (!eliminate(g, c, p, rest)) return false;
  }
  for (const u of g.cellUnits[i]) {
    let place = -1;
    let n = 0;
    for (const j of g.units[u]) {
      if (c[j] & b) {
        n++;
        place = j;
        if (n > 1) break;
      }
    }
    if (n === 0) return false;
    if (n === 1 && popcount(c[place]) > 1 && !assign(g, c, place, b)) return false;
  }
  return true;
}

/** Candidate masks after propagating the givens, or null if the givens contradict. */
export function propagate(grid: Grid): Uint16Array | null {
  const g = geoOf(grid);
  const c = new Uint16Array(g.cells).fill(g.all);
  for (let i = 0; i < g.cells; i++) {
    if (grid[i] && !assign(g, c, i, bit(grid[i]))) return null;
  }
  return c;
}

export interface SolveOptions {
  /** Stop after this many solutions (2 is enough to prove "not unique"). */
  limit?: number;
  /** Random source; when set, digit order is shuffled (used by the generator). */
  rng?: () => number;
  /** Abort after this many search nodes. */
  maxNodes?: number;
}

export interface SolveResult {
  count: number;
  solution: Grid | null;
  /** True when maxNodes was hit before the search finished. */
  aborted: boolean;
}

export function solve(grid: Grid, opts: SolveOptions = {}): SolveResult {
  const limit = opts.limit ?? 1;
  const maxNodes = opts.maxNodes ?? Number.POSITIVE_INFINITY;
  const result: SolveResult = { count: 0, solution: null, aborted: false };
  let nodes = 0;

  const start = propagate(grid);
  if (!start) return result;
  const g = geoOf(grid);

  const search = (c: Uint16Array): void => {
    if (result.count >= limit || result.aborted) return;
    if (++nodes > maxNodes) {
      result.aborted = true;
      return;
    }
    let best = -1;
    let bestCount = 99;
    for (let i = 0; i < g.cells; i++) {
      const n = popcount(c[i]);
      if (n > 1 && n < bestCount) {
        best = i;
        bestCount = n;
        if (n === 2) break;
      }
    }
    if (best < 0) {
      result.count++;
      if (!result.solution) result.solution = Array.from(c, lowestValue);
      return;
    }
    const options: number[] = [];
    let m = c[best];
    while (m) {
      const lb = m & -m;
      m &= ~lb;
      options.push(lb);
    }
    if (opts.rng) shuffle(options, opts.rng);
    for (const b of options) {
      const next = c.slice();
      if (assign(g, next, best, b)) search(next);
      if (result.count >= limit || result.aborted) return;
    }
  };

  search(start);
  return result;
}

/** 0, 1 or 2 (meaning "2 or more"); null if the node budget ran out. */
export function countSolutions(grid: Grid, maxNodes = 200_000): number | null {
  const r = solve(grid, { limit: 2, maxNodes });
  return r.aborted ? null : r.count;
}

export function hasUniqueSolution(grid: Grid, maxNodes?: number): boolean {
  return countSolutions(grid, maxNodes) === 1;
}

export function shuffle<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Small seedable PRNG (mulberry32) so generation and transforms are reproducible. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
