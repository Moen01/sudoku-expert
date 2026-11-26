import { type Geometry, type Grid } from "./grid";
import { BEYOND_TIER, grade } from "./logic";
import { countSolutions, shuffle, solve } from "./solver";

/**
 * Puzzle generator. Up to ~1.5 s per 16x16 puzzle, so it runs at build
 * time (`npm run generate:bank`), not in the browser.
 */

/** A random, complete, valid grid of the given geometry. */
export function generateSolution(rng: () => number, geo: Geometry): Grid {
  const { box, size, cells } = geo;
  for (;;) {
    const grid = new Array<number>(cells).fill(0);
    // The diagonal boxes do not share rows/columns, so fill them freely first.
    for (let d = 0; d < box; d++) {
      const digits = shuffle(Array.from({ length: size }, (_, k) => k + 1), rng);
      for (let k = 0; k < size; k++) {
        const r = d * box + Math.floor(k / box);
        const c = d * box + (k % box);
        grid[r * size + c] = digits[k];
      }
    }
    const r = solve(grid, { rng, maxNodes: 20_000 });
    if (r.solution) return r.solution;
  }
}

export interface DigOptions {
  /** Highest logic tier allowed (1-4), or BEYOND_TIER (5) for "anything with a unique solution". */
  maxTier: number;
  /** Stop removing clues at this count. */
  minClues: number;
}

/**
 * Remove clues in symmetric pairs (cell i and its 180° partner) while the
 * puzzle stays (a) uniquely solvable and (b) within maxTier.
 */
export function digPuzzle(solution: Grid, rng: () => number, opts: DigOptions): Grid {
  const puzzle = solution.slice();
  const cells = solution.length;
  let clues = cells;
  // For odd cell counts (81) the centre cell is its own partner; ceil() includes it once.
  const order = shuffle(
    Array.from({ length: Math.ceil(cells / 2) }, (_, i) => i),
    rng,
  );
  for (const i of order) {
    if (clues <= opts.minClues) break;
    const j = cells - 1 - i;
    const keep = [puzzle[i], puzzle[j]];
    puzzle[i] = 0;
    puzzle[j] = 0;
    // A logic-solvable puzzle is always unique, so the cheap check is enough below tier 5.
    const ok =
      opts.maxTier < BEYOND_TIER ? grade(puzzle, opts.maxTier).solved : countSolutions(puzzle, 50_000) === 1;
    if (ok) {
      clues -= i === j ? 1 : 2;
    } else {
      puzzle[i] = keep[0];
      puzzle[j] = keep[1];
    }
  }
  return puzzle;
}

export const clueCount = (g: Grid): number => g.filter((v) => v !== 0).length;
