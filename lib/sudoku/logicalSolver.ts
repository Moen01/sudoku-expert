/**
 * Human-style logical solver.
 *
 * Instead of brute force, this solver applies named deduction techniques in
 * order of difficulty. It powers two features:
 *   1. Difficulty grading — the hardest technique required classifies a puzzle.
 *   2. Hints — the first available step is explained to the player.
 *
 * Candidates are tracked as 9-bit masks per cell. Placements update the grid
 * and peers' candidates; eliminations only trim candidate masks.
 */

import {
  ALL_DIGITS_MASK,
  BOXES,
  CELL_COUNT,
  COLS,
  PEERS,
  ROWS,
  UNITS,
  bit,
  boxOf,
  colOf,
  digitsFromMask,
  popCount,
  rowOf,
} from './constants';
import { cellLabel, cloneGrid, isFull } from './grid';
import type { DifficultyBand, DifficultyReport, Grid, SolveStep, Technique } from './types';

/** Techniques ordered easiest → hardest. The solver tries them in this order. */
export const TECHNIQUE_ORDER: Technique[] = [
  'naked-single',
  'hidden-single',
  'pointing',
  'box-line-reduction',
  'naked-pair',
  'hidden-pair',
  'naked-triple',
  'hidden-triple',
  'x-wing',
  'xy-wing',
  'swordfish',
];

/** Relative cost of each technique, used for the cumulative difficulty score. */
export const TECHNIQUE_WEIGHT: Record<Technique, number> = {
  'naked-single': 1,
  'hidden-single': 2,
  pointing: 5,
  'box-line-reduction': 5,
  'naked-pair': 8,
  'hidden-pair': 10,
  'naked-triple': 13,
  'hidden-triple': 16,
  'x-wing': 25,
  'xy-wing': 30,
  swordfish: 40,
};

/**
 * The band a puzzle earns from its single hardest required technique. This is
 * the primary difficulty signal (a la Sudoku-Explainer style ratings).
 */
export const TECHNIQUE_TIER: Record<Technique, DifficultyBand> = {
  'naked-single': 'easy',
  'hidden-single': 'easy',
  pointing: 'medium',
  'box-line-reduction': 'medium',
  'naked-pair': 'hard',
  'hidden-pair': 'hard',
  'naked-triple': 'expert',
  'hidden-triple': 'expert',
  'x-wing': 'extreme',
  'xy-wing': 'extreme',
  swordfish: 'extreme',
};

const BAND_RANK: Record<DifficultyBand, number> = {
  easy: 0,
  medium: 1,
  hard: 2,
  expert: 3,
  extreme: 4,
};

export interface LogicalResult {
  solved: boolean;
  grid: Grid;
  steps: SolveStep[];
  report: DifficultyReport;
}

type Candidates = number[];

function computeCandidates(grid: Grid): Candidates {
  const rowUsed = new Array<number>(9).fill(0);
  const colUsed = new Array<number>(9).fill(0);
  const boxUsed = new Array<number>(9).fill(0);
  for (let cell = 0; cell < CELL_COUNT; cell++) {
    const d = grid[cell];
    if (d === 0) continue;
    const b = bit(d);
    rowUsed[rowOf(cell)] |= b;
    colUsed[colOf(cell)] |= b;
    boxUsed[boxOf(cell)] |= b;
  }
  const cands: Candidates = new Array(CELL_COUNT).fill(0);
  for (let cell = 0; cell < CELL_COUNT; cell++) {
    if (grid[cell] !== 0) continue;
    cands[cell] = ALL_DIGITS_MASK & ~(rowUsed[rowOf(cell)] | colUsed[colOf(cell)] | boxUsed[boxOf(cell)]);
  }
  return cands;
}

function placeDigit(grid: Grid, cands: Candidates, cell: number, digit: number): void {
  grid[cell] = digit;
  cands[cell] = 0;
  const b = bit(digit);
  for (const peer of PEERS[cell]) {
    cands[peer] &= ~b;
  }
}

function applyEliminations(cands: Candidates, eliminations: { cell: number; digit: number }[]): void {
  for (const { cell, digit } of eliminations) {
    cands[cell] &= ~bit(digit);
  }
}

/** All k-combinations of indices [0, n). */
function combinations(n: number, k: number): number[][] {
  const result: number[][] = [];
  const combo: number[] = [];
  const recurse = (start: number): void => {
    if (combo.length === k) {
      result.push(combo.slice());
      return;
    }
    for (let i = start; i < n; i++) {
      combo.push(i);
      recurse(i + 1);
      combo.pop();
    }
  };
  recurse(0);
  return result;
}

// --- Technique implementations --------------------------------------------

function findNakedSingle(grid: Grid, cands: Candidates): SolveStep | null {
  for (let cell = 0; cell < CELL_COUNT; cell++) {
    if (grid[cell] !== 0) continue;
    if (popCount(cands[cell]) === 1) {
      const digit = digitsFromMask(cands[cell])[0];
      return {
        technique: 'naked-single',
        placement: { cell, digit },
        reason: [cell],
        explanation: `${cellLabel(cell)} has only one possible digit: ${digit}.`,
      };
    }
  }
  return null;
}

function findHiddenSingle(grid: Grid, cands: Candidates): SolveStep | null {
  for (let u = 0; u < UNITS.length; u++) {
    const unit = UNITS[u];
    for (let d = 1; d <= 9; d++) {
      const b = bit(d);
      let only = -1;
      let count = 0;
      for (const cell of unit) {
        if (grid[cell] === 0 && cands[cell] & b) {
          only = cell;
          count++;
          if (count > 1) break;
        }
      }
      if (count === 1) {
        // Skip if it is also a naked single (already handled, keep steps distinct).
        if (popCount(cands[only]) === 1) continue;
        return {
          technique: 'hidden-single',
          placement: { cell: only, digit: d },
          reason: [only],
          explanation: `${d} can only go in ${cellLabel(only)} within its ${unitName(u)}.`,
        };
      }
    }
  }
  return null;
}

function unitName(unitIndex: number): string {
  if (unitIndex < 9) return `row ${unitIndex + 1}`;
  if (unitIndex < 18) return `column ${unitIndex - 9 + 1}`;
  return `box ${unitIndex - 18 + 1}`;
}

function findPointing(grid: Grid, cands: Candidates): SolveStep | null {
  for (let b = 0; b < 9; b++) {
    const box = BOXES[b];
    for (let d = 1; d <= 9; d++) {
      const mask = bit(d);
      const cells = box.filter((c) => grid[c] === 0 && cands[c] & mask);
      if (cells.length < 2 || cells.length > 3) continue;
      const rows = new Set(cells.map(rowOf));
      const cols = new Set(cells.map(colOf));
      if (rows.size === 1) {
        const r = cells[0];
        const targets = ROWS[rowOf(r)].filter((c) => boxOf(c) !== b && grid[c] === 0 && cands[c] & mask);
        if (targets.length) {
          return {
            technique: 'pointing',
            eliminations: targets.map((cell) => ({ cell, digit: d })),
            reason: cells,
            explanation: `In box ${b + 1}, ${d} is confined to row ${rowOf(r) + 1}, so ${d} is removed from the rest of that row.`,
          };
        }
      }
      if (cols.size === 1) {
        const cc = cells[0];
        const targets = COLS[colOf(cc)].filter((c) => boxOf(c) !== b && grid[c] === 0 && cands[c] & mask);
        if (targets.length) {
          return {
            technique: 'pointing',
            eliminations: targets.map((cell) => ({ cell, digit: d })),
            reason: cells,
            explanation: `In box ${b + 1}, ${d} is confined to column ${colOf(cc) + 1}, so ${d} is removed from the rest of that column.`,
          };
        }
      }
    }
  }
  return null;
}

function findBoxLineReduction(grid: Grid, cands: Candidates): SolveStep | null {
  const lines = [...ROWS, ...COLS];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isRow = i < 9;
    for (let d = 1; d <= 9; d++) {
      const mask = bit(d);
      const cells = line.filter((c) => grid[c] === 0 && cands[c] & mask);
      if (cells.length < 2 || cells.length > 3) continue;
      const boxes = new Set(cells.map(boxOf));
      if (boxes.size === 1) {
        const b = boxOf(cells[0]);
        const targets = BOXES[b].filter(
          (c) => !line.includes(c) && grid[c] === 0 && cands[c] & mask,
        );
        if (targets.length) {
          return {
            technique: 'box-line-reduction',
            eliminations: targets.map((cell) => ({ cell, digit: d })),
            reason: cells,
            explanation: `In ${isRow ? `row ${rowOf(cells[0]) + 1}` : `column ${colOf(cells[0]) + 1}`}, ${d} is confined to box ${b + 1}, so ${d} is removed from the rest of that box.`,
          };
        }
      }
    }
  }
  return null;
}

function findNakedSubset(
  grid: Grid,
  cands: Candidates,
  size: number,
  technique: Technique,
): SolveStep | null {
  for (let u = 0; u < UNITS.length; u++) {
    const unit = UNITS[u];
    const open = unit.filter((c) => grid[c] === 0 && popCount(cands[c]) >= 2 && popCount(cands[c]) <= size);
    if (open.length < size) continue;
    for (const combo of combinations(open.length, size)) {
      let union = 0;
      for (const idx of combo) union |= cands[open[idx]];
      if (popCount(union) !== size) continue;
      const comboCells = combo.map((idx) => open[idx]);
      const digits = digitsFromMask(union);
      const eliminations: { cell: number; digit: number }[] = [];
      for (const cell of unit) {
        if (grid[cell] !== 0 || comboCells.includes(cell)) continue;
        for (const d of digits) {
          if (cands[cell] & bit(d)) eliminations.push({ cell, digit: d });
        }
      }
      if (eliminations.length) {
        return {
          technique,
          eliminations,
          reason: comboCells,
          explanation: `Naked ${subsetName(size)} {${digits.join(', ')}} in ${unitName(u)} removes those digits from the other cells.`,
        };
      }
    }
  }
  return null;
}

function findHiddenSubset(
  grid: Grid,
  cands: Candidates,
  size: number,
  technique: Technique,
): SolveStep | null {
  for (let u = 0; u < UNITS.length; u++) {
    const unit = UNITS[u];
    const digitCells = new Map<number, number[]>();
    for (let d = 1; d <= 9; d++) {
      const cells = unit.filter((c) => grid[c] === 0 && cands[c] & bit(d));
      if (cells.length >= 1 && cells.length <= size) digitCells.set(d, cells);
    }
    const candidateDigits = [...digitCells.keys()];
    if (candidateDigits.length < size) continue;
    for (const combo of combinations(candidateDigits.length, size)) {
      const digits = combo.map((idx) => candidateDigits[idx]);
      const cellUnion = new Set<number>();
      for (const d of digits) {
        for (const c of digitCells.get(d)!) cellUnion.add(c);
      }
      if (cellUnion.size !== size) continue;
      const keepMask = digits.reduce((m, d) => m | bit(d), 0);
      const eliminations: { cell: number; digit: number }[] = [];
      for (const cell of cellUnion) {
        const extra = cands[cell] & ~keepMask;
        for (const d of digitsFromMask(extra)) eliminations.push({ cell, digit: d });
      }
      if (eliminations.length) {
        return {
          technique,
          eliminations,
          reason: [...cellUnion],
          explanation: `Hidden ${subsetName(size)} {${digits.join(', ')}} in ${unitName(u)} fixes those cells to only those digits.`,
        };
      }
    }
  }
  return null;
}

function subsetName(size: number): string {
  return size === 2 ? 'pair' : size === 3 ? 'triple' : `${size}-set`;
}

function findFish(
  grid: Grid,
  cands: Candidates,
  size: number,
  technique: Technique,
): SolveStep | null {
  for (const orientation of ['row', 'col'] as const) {
    const baseUnits = orientation === 'row' ? ROWS : COLS;
    for (let d = 1; d <= 9; d++) {
      const mask = bit(d);
      // For each base line, the cross-indices (columns for rows) where d is a candidate.
      const lineOptions: { line: number; positions: number[] }[] = [];
      for (let l = 0; l < 9; l++) {
        const positions: number[] = [];
        for (const cell of baseUnits[l]) {
          if (grid[cell] === 0 && cands[cell] & mask) {
            positions.push(orientation === 'row' ? colOf(cell) : rowOf(cell));
          }
        }
        if (positions.length >= 2 && positions.length <= size) {
          lineOptions.push({ line: l, positions });
        }
      }
      if (lineOptions.length < size) continue;
      for (const combo of combinations(lineOptions.length, size)) {
        const chosen = combo.map((idx) => lineOptions[idx]);
        const coverPositions = new Set<number>();
        for (const c of chosen) for (const p of c.positions) coverPositions.add(p);
        if (coverPositions.size !== size) continue;
        const baseLines = new Set(chosen.map((c) => c.line));
        const eliminations: { cell: number; digit: number }[] = [];
        for (const pos of coverPositions) {
          const crossUnit = orientation === 'row' ? COLS[pos] : ROWS[pos];
          for (const cell of crossUnit) {
            const baseLine = orientation === 'row' ? rowOf(cell) : colOf(cell);
            if (baseLines.has(baseLine)) continue;
            if (grid[cell] === 0 && cands[cell] & mask) {
              eliminations.push({ cell, digit: d });
            }
          }
        }
        if (eliminations.length) {
          const reason: number[] = [];
          for (const c of chosen) {
            for (const cell of baseUnits[c.line]) {
              if (grid[cell] === 0 && cands[cell] & mask) reason.push(cell);
            }
          }
          return {
            technique,
            eliminations,
            reason,
            explanation: `${technique === 'x-wing' ? 'X-Wing' : 'Swordfish'} on ${d} across ${size} ${orientation === 'row' ? 'rows' : 'columns'} removes ${d} from the intersecting ${orientation === 'row' ? 'columns' : 'rows'}.`,
          };
        }
      }
    }
  }
  return null;
}

function findXYWing(grid: Grid, cands: Candidates): SolveStep | null {
  const bivalue: number[] = [];
  for (let cell = 0; cell < CELL_COUNT; cell++) {
    if (grid[cell] === 0 && popCount(cands[cell]) === 2) bivalue.push(cell);
  }
  for (const pivot of bivalue) {
    const [x, y] = digitsFromMask(cands[pivot]);
    const peers = PEERS[pivot].filter((c) => bivalue.includes(c));
    for (const p1 of peers) {
      for (const p2 of peers) {
        if (p1 >= p2) continue;
        const m1 = cands[p1];
        const m2 = cands[p2];
        // p1 must share exactly one of pivot's digits, p2 the other, plus a common z.
        if (!(m1 & bit(x)) || !(m2 & bit(y))) continue;
        const z1 = m1 & ~bit(x);
        const z2 = m2 & ~bit(y);
        if (z1 !== z2 || popCount(z1) !== 1) continue;
        const z = digitsFromMask(z1)[0];
        if (z === x || z === y) continue;
        const seenByBoth = PEERS[p1].filter(
          (c) => c !== pivot && PEERS[p2].includes(c) && grid[c] === 0 && cands[c] & bit(z),
        );
        if (seenByBoth.length) {
          return {
            technique: 'xy-wing',
            eliminations: seenByBoth.map((cell) => ({ cell, digit: z })),
            reason: [pivot, p1, p2],
            explanation: `XY-Wing with pivot ${cellLabel(pivot)} removes ${z} from cells seen by both pincers.`,
          };
        }
      }
    }
  }
  return null;
}

type Finder = (grid: Grid, cands: Candidates) => SolveStep | null;

const FINDERS: Record<Technique, Finder> = {
  'naked-single': findNakedSingle,
  'hidden-single': findHiddenSingle,
  pointing: findPointing,
  'box-line-reduction': findBoxLineReduction,
  'naked-pair': (g, c) => findNakedSubset(g, c, 2, 'naked-pair'),
  'hidden-pair': (g, c) => findHiddenSubset(g, c, 2, 'hidden-pair'),
  'naked-triple': (g, c) => findNakedSubset(g, c, 3, 'naked-triple'),
  'hidden-triple': (g, c) => findHiddenSubset(g, c, 3, 'hidden-triple'),
  'x-wing': (g, c) => findFish(g, c, 2, 'x-wing'),
  'xy-wing': findXYWing,
  swordfish: (g, c) => findFish(g, c, 3, 'swordfish'),
};

/** Find the next logical step for the current grid, or null if stuck. */
export function findNextStep(grid: Grid): SolveStep | null {
  const working = cloneGrid(grid);
  const cands = computeCandidates(working);
  for (const technique of TECHNIQUE_ORDER) {
    const step = FINDERS[technique](working, cands);
    if (step) return step;
  }
  return null;
}

export interface PlacementHint {
  cell: number;
  digit: number;
  /** Technique that directly produced the placement. */
  technique: Technique;
  explanation: string;
  reason: number[];
  /** The most recent elimination step that unlocked this placement, if any. */
  enabledBy?: { technique: Technique; explanation: string; reason: number[] };
}

/**
 * Advance the logical solver until it can place a digit, applying any
 * intermediate candidate eliminations. Returns the placement together with the
 * elimination technique that enabled it, so a hint can both place a digit and
 * explain the reasoning. Returns null only if the board is complete or stuck.
 */
export function findNextPlacement(input: Grid): PlacementHint | null {
  const grid = cloneGrid(input);
  const cands = computeCandidates(grid);
  let enabledBy: PlacementHint['enabledBy'];

  for (let guard = 0; guard < 2000; guard++) {
    let step: SolveStep | null = null;
    for (const technique of TECHNIQUE_ORDER) {
      step = FINDERS[technique](grid, cands);
      if (step) break;
    }
    if (!step) return null;

    if (step.placement) {
      return {
        cell: step.placement.cell,
        digit: step.placement.digit,
        technique: step.technique,
        explanation: step.explanation,
        reason: step.reason,
        enabledBy,
      };
    }
    if (step.eliminations) {
      enabledBy = { technique: step.technique, explanation: step.explanation, reason: step.reason };
      applyEliminations(cands, step.eliminations);
    }
  }
  return null;
}

/**
 * Fully solve a grid using logical techniques where possible and report the
 * difficulty. If the solver gets stuck, `solved` is false.
 */
export function solveLogically(input: Grid): LogicalResult {
  const grid = cloneGrid(input);
  const cands = computeCandidates(grid);
  const steps: SolveStep[] = [];
  const techniqueCounts: Partial<Record<Technique, number>> = {};
  let score = 0;

  // Hard cap guards against any pathological non-terminating deduction.
  for (let guard = 0; guard < 2000 && !isFull(grid); guard++) {
    let step: SolveStep | null = null;
    for (const technique of TECHNIQUE_ORDER) {
      step = FINDERS[technique](grid, cands);
      if (step) break;
    }
    if (!step) break;

    techniqueCounts[step.technique] = (techniqueCounts[step.technique] ?? 0) + 1;
    score += TECHNIQUE_WEIGHT[step.technique];
    steps.push(step);

    if (step.placement) {
      placeDigit(grid, cands, step.placement.cell, step.placement.digit);
    } else if (step.eliminations) {
      applyEliminations(cands, step.eliminations);
    }
  }

  const solved = isFull(grid);
  let hardestTechnique: Technique | null = null;
  for (const t of TECHNIQUE_ORDER) {
    if (techniqueCounts[t]) hardestTechnique = t;
  }

  return {
    solved,
    grid,
    steps,
    report: {
      solved,
      band: classifyFromReport(solved, hardestTechnique),
      score,
      hardestTechnique,
      techniqueCounts,
    },
  };
}

function classifyFromReport(solved: boolean, hardestTechnique: Technique | null): DifficultyBand {
  // A puzzle that defeats our full technique set needs chain logic beyond it:
  // that is at least extreme.
  if (!solved) return 'extreme';
  if (!hardestTechnique) return 'easy';
  return TECHNIQUE_TIER[hardestTechnique];
}

/** Convenience: grade a puzzle grid. */
export function gradePuzzle(grid: Grid): DifficultyReport {
  return solveLogically(grid).report;
}

export function bandAtLeast(band: DifficultyBand, min: DifficultyBand): boolean {
  return BAND_RANK[band] >= BAND_RANK[min];
}
