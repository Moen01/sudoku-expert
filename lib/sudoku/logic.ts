import { bit, cellName, geoOf, lowestValue, popcount, symbolOf, type Geometry, type Grid } from "./grid";

/**
 * Human-style logical solver. Used for two things:
 *  1. Grading: solve a puzzle step by step with the easiest technique that
 *     works, and record the hardest technique that was needed.
 *  2. Hints: find the next logical move on the player's board.
 *
 * All techniques are sound (they never remove a true candidate), so if this
 * solver finishes, the puzzle has exactly one solution.
 */

export type Technique =
  | "hidden-single"
  | "naked-single"
  | "pointing"
  | "box-line"
  | "naked-pair"
  | "hidden-pair"
  | "naked-triple"
  | "hidden-triple"
  | "naked-quad"
  | "hidden-quad"
  | "x-wing"
  | "swordfish";

export interface TechniqueInfo {
  name: string;
  /** 1 = singles, 2 = intersections and pairs, 3 = triples and quads, 4 = fish. */
  tier: 1 | 2 | 3 | 4;
  /** Added to the puzzle score each time the technique is used. */
  weight: number;
}

export const TECHNIQUES: Record<Technique, TechniqueInfo> = {
  "hidden-single": { name: "Hidden single", tier: 1, weight: 1 },
  "naked-single": { name: "Naked single", tier: 1, weight: 2 },
  pointing: { name: "Pointing pair/triple", tier: 2, weight: 4 },
  "box-line": { name: "Box/line reduction", tier: 2, weight: 4 },
  "naked-pair": { name: "Naked pair", tier: 2, weight: 5 },
  "hidden-pair": { name: "Hidden pair", tier: 2, weight: 6 },
  "naked-triple": { name: "Naked triple", tier: 3, weight: 9 },
  "hidden-triple": { name: "Hidden triple", tier: 3, weight: 11 },
  "naked-quad": { name: "Naked quad", tier: 3, weight: 13 },
  "hidden-quad": { name: "Hidden quad", tier: 3, weight: 15 },
  "x-wing": { name: "X-Wing", tier: 4, weight: 20 },
  swordfish: { name: "Swordfish", tier: 4, weight: 25 },
};

/** Tier 5 means "the techniques above were not enough" (needs chains or trial and error). */
export const BEYOND_TIER = 5;

export interface Placement {
  cell: number;
  value: number;
}
export interface Elimination {
  cell: number;
  mask: number;
}

export interface Step {
  technique: Technique;
  placements: Placement[];
  eliminations: Elimination[];
  /** Short human-readable explanation. */
  description: string;
}

const unitName = (g: Geometry, u: number): string => {
  if (u < g.size) return `row ${u + 1}`;
  if (u < 2 * g.size) return `column ${u - g.size + 1}`;
  return `box ${u - 2 * g.size + 1}`;
};

const symbols = (mask: number): string => {
  const out: string[] = [];
  for (let v = 1; v <= 16; v++) if (mask & bit(v)) out.push(symbolOf(v));
  return out.join(", ");
};

function* combinations<T>(items: readonly T[], k: number, start = 0, acc: T[] = []): Generator<T[]> {
  if (acc.length === k) {
    yield acc.slice();
    return;
  }
  for (let i = start; i <= items.length - (k - acc.length); i++) {
    acc.push(items[i]);
    yield* combinations(items, k, i + 1, acc);
    acc.pop();
  }
}

export class LogicState {
  readonly geo: Geometry;
  readonly values: number[];
  /** Candidate mask per cell; 0 for filled cells. */
  readonly cands: Uint16Array;

  private constructor(geo: Geometry) {
    this.geo = geo;
    this.values = new Array<number>(geo.cells).fill(0);
    this.cands = new Uint16Array(geo.cells).fill(geo.all);
  }

  /** Build from a grid of values. Returns null if the grid breaks a rule. */
  static fromGrid(grid: Grid): LogicState | null {
    const s = new LogicState(geoOf(grid));
    for (let i = 0; i < s.geo.cells; i++) {
      const v = grid[i];
      if (!v) continue;
      if (!(s.cands[i] & bit(v))) return null;
      s.place(i, v);
    }
    return s;
  }

  place(i: number, v: number): void {
    this.values[i] = v;
    this.cands[i] = 0;
    const b = bit(v);
    for (const p of this.geo.peers[i]) this.cands[p] &= ~b;
  }

  apply(step: Step): void {
    for (const e of step.eliminations) this.cands[e.cell] &= ~e.mask;
    for (const p of step.placements) if (!this.values[p.cell]) this.place(p.cell, p.value);
  }

  isSolved(): boolean {
    return this.values.every((v) => v !== 0);
  }

  hasContradiction(): boolean {
    return this.values.some((v, i) => v === 0 && this.cands[i] === 0);
  }

  /** Cells in a unit that are empty and still allow digit mask b. */
  cellsWith(unit: readonly number[], b: number): number[] {
    return unit.filter((i) => !this.values[i] && this.cands[i] & b);
  }
}

// ---------- techniques ----------

// Boxes first, then rows, then columns: that is how most people scan.
const scanOrder = (g: Geometry): number[] => [
  ...Array.from({ length: g.size }, (_, b) => 2 * g.size + b),
  ...Array.from({ length: 2 * g.size }, (_, u) => u),
];

function hiddenSingle(s: LogicState): Step | null {
  const g = s.geo;
  for (const u of scanOrder(g)) {
    const unit = g.units[u];
    for (let v = 1; v <= g.size; v++) {
      const cells = s.cellsWith(unit, bit(v));
      if (cells.length === 1) {
        return {
          technique: "hidden-single",
          placements: [{ cell: cells[0], value: v }],
          eliminations: [],
          description: `In ${unitName(g, u)}, ${symbolOf(v)} can only go in ${cellName(cells[0], g.size)}.`,
        };
      }
    }
  }
  return null;
}

function nakedSingle(s: LogicState): Step | null {
  for (let i = 0; i < s.geo.cells; i++) {
    if (!s.values[i] && popcount(s.cands[i]) === 1) {
      const v = lowestValue(s.cands[i]);
      return {
        technique: "naked-single",
        placements: [{ cell: i, value: v }],
        eliminations: [],
        description: `${cellName(i, s.geo.size)} can only be ${symbolOf(v)}: every other symbol is already in its row, column or box.`,
      };
    }
  }
  return null;
}

/** A digit inside a box is confined to one row/column, so remove it from the rest of that line. */
function pointing(s: LogicState): Step | null {
  const g = s.geo;
  for (let b = 0; b < g.size; b++) {
    const box = g.units[2 * g.size + b];
    for (let v = 1; v <= g.size; v++) {
      const cells = s.cellsWith(box, bit(v));
      if (cells.length < 2) continue;
      for (const [lineOf, base, label] of [
        [g.rowOf, 0, "row"],
        [g.colOf, g.size, "column"],
      ] as const) {
        const line = lineOf(cells[0]);
        if (!cells.every((c) => lineOf(c) === line)) continue;
        const elim = s
          .cellsWith(g.units[base + line], bit(v))
          .filter((c) => g.boxOf(c) !== b)
          .map((cell) => ({ cell, mask: bit(v) }));
        if (elim.length) {
          return {
            technique: "pointing",
            placements: [],
            eliminations: elim,
            description: `In box ${b + 1}, ${symbolOf(v)} must be in ${label} ${line + 1}, so remove ${symbolOf(v)} from the rest of that ${label}.`,
          };
        }
      }
    }
  }
  return null;
}

/** A digit inside a row/column is confined to one box, so remove it from the rest of that box. */
function boxLine(s: LogicState): Step | null {
  const g = s.geo;
  for (let u = 0; u < 2 * g.size; u++) {
    for (let v = 1; v <= g.size; v++) {
      const cells = s.cellsWith(g.units[u], bit(v));
      if (cells.length < 2 || cells.length > g.box) continue;
      const b = g.boxOf(cells[0]);
      if (!cells.every((c) => g.boxOf(c) === b)) continue;
      const inLine = u < g.size ? (c: number) => g.rowOf(c) === u : (c: number) => g.colOf(c) === u - g.size;
      const elim = s
        .cellsWith(g.units[2 * g.size + b], bit(v))
        .filter((c) => !inLine(c))
        .map((cell) => ({ cell, mask: bit(v) }));
      if (elim.length) {
        return {
          technique: "box-line",
          placements: [],
          eliminations: elim,
          description: `In ${unitName(g, u)}, ${symbolOf(v)} must be inside box ${b + 1}, so remove ${symbolOf(v)} from the rest of box ${b + 1}.`,
        };
      }
    }
  }
  return null;
}

const NAKED: Record<number, Technique> = { 2: "naked-pair", 3: "naked-triple", 4: "naked-quad" };
const HIDDEN: Record<number, Technique> = { 2: "hidden-pair", 3: "hidden-triple", 4: "hidden-quad" };

/** k cells in a unit share exactly k candidates, so those digits leave the other cells. */
function nakedSubset(s: LogicState, k: number): Step | null {
  const g = s.geo;
  for (let u = 0; u < g.units.length; u++) {
    const empties = g.units[u].filter((i) => !s.values[i]);
    if (empties.length <= k) continue;
    const pool = empties.filter((i) => popcount(s.cands[i]) <= k);
    for (const combo of combinations(pool, k)) {
      let union = 0;
      for (const i of combo) union |= s.cands[i];
      if (popcount(union) !== k) continue;
      const elim = empties
        .filter((i) => !combo.includes(i) && s.cands[i] & union)
        .map((cell) => ({ cell, mask: s.cands[cell] & union }));
      if (elim.length) {
        return {
          technique: NAKED[k],
          placements: [],
          eliminations: elim,
          description: `In ${unitName(g, u)}, ${k} cells hold only {${symbols(union)}}, so those symbols leave the other cells of ${unitName(g, u)}.`,
        };
      }
    }
  }
  return null;
}

/** k digits in a unit fit only in the same k cells, so those cells lose every other candidate. */
function hiddenSubset(s: LogicState, k: number): Step | null {
  const g = s.geo;
  for (let u = 0; u < g.units.length; u++) {
    const unit = g.units[u];
    const digits: { v: number; cells: number[] }[] = [];
    for (let v = 1; v <= g.size; v++) {
      const cells = s.cellsWith(unit, bit(v));
      if (cells.length >= 2 && cells.length <= k) digits.push({ v, cells });
    }
    for (const combo of combinations(digits, k)) {
      const cells = new Set<number>();
      let dmask = 0;
      for (const d of combo) {
        dmask |= bit(d.v);
        for (const c of d.cells) cells.add(c);
      }
      if (cells.size !== k) continue;
      const elim = [...cells]
        .filter((c) => s.cands[c] & ~dmask)
        .map((cell) => ({ cell, mask: s.cands[cell] & ~dmask }));
      if (elim.length) {
        return {
          technique: HIDDEN[k],
          placements: [],
          eliminations: elim,
          description: `In ${unitName(g, u)}, {${symbols(dmask)}} fit only in ${k} cells, so those cells can hold nothing else.`,
        };
      }
    }
  }
  return null;
}

/** X-Wing (k = 2) and Swordfish (k = 3), on rows and on columns. */
function fish(s: LogicState, k: number): Step | null {
  const tech: Technique = k === 2 ? "x-wing" : "swordfish";
  const size = s.geo.size;
  for (let v = 1; v <= size; v++) {
    const b = bit(v);
    for (const byRow of [true, false]) {
      // For each line, the set of cross positions (as a bitmask) where v can go.
      const lines: { line: number; mask: number }[] = [];
      for (let line = 0; line < size; line++) {
        let mask = 0;
        for (let x = 0; x < size; x++) {
          const i = byRow ? line * size + x : x * size + line;
          if (!s.values[i] && s.cands[i] & b) mask |= 1 << x;
        }
        const n = popcount(mask);
        if (n >= 2 && n <= k) lines.push({ line, mask });
      }
      for (const combo of combinations(lines, k)) {
        let cover = 0;
        for (const l of combo) cover |= l.mask;
        if (popcount(cover) !== k) continue;
        const baseLines = new Set(combo.map((l) => l.line));
        const elim: Elimination[] = [];
        for (let x = 0; x < size; x++) {
          if (!(cover & (1 << x))) continue;
          for (let line = 0; line < size; line++) {
            if (baseLines.has(line)) continue;
            const i = byRow ? line * size + x : x * size + line;
            if (!s.values[i] && s.cands[i] & b) elim.push({ cell: i, mask: b });
          }
        }
        if (elim.length) {
          const kind = byRow ? "rows" : "columns";
          const other = byRow ? "columns" : "rows";
          return {
            technique: tech,
            placements: [],
            eliminations: elim,
            description: `${TECHNIQUES[tech].name} on ${symbolOf(v)}: in ${kind} ${[...baseLines].map((l) => l + 1).join(", ")} it fits only in the same ${k} ${other}, so remove ${symbolOf(v)} from the rest of those ${other}.`,
          };
        }
      }
    }
  }
  return null;
}

const ORDER: { tier: number; find: (s: LogicState) => Step | null }[] = [
  { tier: 1, find: hiddenSingle },
  { tier: 1, find: nakedSingle },
  { tier: 2, find: pointing },
  { tier: 2, find: boxLine },
  { tier: 2, find: (s) => nakedSubset(s, 2) },
  { tier: 2, find: (s) => hiddenSubset(s, 2) },
  { tier: 3, find: (s) => nakedSubset(s, 3) },
  { tier: 3, find: (s) => hiddenSubset(s, 3) },
  { tier: 3, find: (s) => nakedSubset(s, 4) },
  { tier: 3, find: (s) => hiddenSubset(s, 4) },
  { tier: 4, find: (s) => fish(s, 2) },
  { tier: 4, find: (s) => fish(s, 3) },
];

/** The easiest available step, using only techniques up to maxTier. */
export function nextStep(s: LogicState, maxTier = 4): Step | null {
  for (const t of ORDER) {
    if (t.tier > maxTier) break;
    const step = t.find(s);
    if (step) return step;
  }
  return null;
}

export interface Grade {
  /** True when the logical solver filled every cell. */
  solved: boolean;
  /** Hardest tier used, or BEYOND_TIER (5) when the solver got stuck. */
  maxTier: number;
  score: number;
  counts: Partial<Record<Technique, number>>;
}

export function grade(puzzle: Grid, maxTier = 4): Grade {
  const s = LogicState.fromGrid(puzzle);
  const g: Grade = { solved: false, maxTier: 0, score: 0, counts: {} };
  if (!s) return { ...g, maxTier: BEYOND_TIER };
  while (!s.isSolved()) {
    if (s.hasContradiction()) return { ...g, maxTier: BEYOND_TIER };
    const step = nextStep(s, maxTier);
    if (!step) return { ...g, maxTier: BEYOND_TIER };
    const info = TECHNIQUES[step.technique];
    g.counts[step.technique] = (g.counts[step.technique] ?? 0) + 1;
    g.score += info.weight;
    g.maxTier = Math.max(g.maxTier, info.tier);
    s.apply(step);
  }
  g.solved = true;
  return g;
}
