import { G16, G9, geoOf, type Grid } from "./grid";

/** 81 or 256 cells, each 0..size. */
export function isGridShape(g: unknown): g is Grid {
  if (!Array.isArray(g) || (g.length !== G9.cells && g.length !== G16.cells)) return false;
  const size = geoOf(g).size;
  return g.every((v) => Number.isInteger(v) && v >= 0 && v <= size);
}

/** Cells whose value repeats in a row, column or box (rule conflicts, not "wrong vs solution"). */
export function findConflicts(values: Grid): boolean[] {
  const geo = geoOf(values);
  const out = new Array<boolean>(geo.cells).fill(false);
  for (let i = 0; i < geo.cells; i++) {
    const v = values[i];
    if (!v) continue;
    for (const p of geo.peers[i]) {
      if (values[p] === v) {
        out[i] = true;
        break;
      }
    }
  }
  return out;
}

export function hasConflicts(values: Grid): boolean {
  return findConflicts(values).some(Boolean);
}

/** Every unit contains 1..size exactly once. */
export function isSolvedGrid(values: Grid): boolean {
  if (!isGridShape(values)) return false;
  const geo = geoOf(values);
  return geo.units.every((unit) => {
    let mask = 0;
    for (const i of unit) {
      if (!values[i]) return false;
      mask |= 1 << (values[i] - 1);
    }
    return mask === geo.all;
  });
}

/** Same size, givens are a subset of the solution, and the solution is a valid grid. */
export function puzzleMatchesSolution(puzzle: Grid, solution: Grid): boolean {
  if (!isGridShape(puzzle) || !isSolvedGrid(solution) || puzzle.length !== solution.length) return false;
  return puzzle.every((v, i) => v === 0 || v === solution[i]);
}
