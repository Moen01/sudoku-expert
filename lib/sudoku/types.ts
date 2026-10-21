/**
 * Core Sudoku domain types.
 *
 * A board is represented as a flat array of 81 numbers in row-major order.
 * `0` denotes an empty cell; `1`‑`9` denote filled digits. Cells are indexed
 * `0`‑`80` where `row = Math.floor(i / 9)` and `col = i % 9`.
 */

/** A full or partial board: 81 cells, each 0 (empty) or 1‑9. */
export type Grid = number[];

/** A pencil-mark set per cell encoded as a bitmask (bit `d-1` set => digit `d`). */
export type NoteMask = number;

/** Human solving techniques, ordered roughly from easiest to hardest. */
export type Technique =
  | 'naked-single'
  | 'hidden-single'
  | 'pointing'
  | 'box-line-reduction'
  | 'naked-pair'
  | 'hidden-pair'
  | 'naked-triple'
  | 'hidden-triple'
  | 'x-wing'
  | 'xy-wing'
  | 'swordfish';

/** Difficulty classification bands. This app only ships `extreme`. */
export type DifficultyBand = 'easy' | 'medium' | 'hard' | 'expert' | 'extreme';

/** A single deductive step produced by the logical solver. */
export interface SolveStep {
  technique: Technique;
  /** Cell + digit that this step places (undefined for pure eliminations). */
  placement?: { cell: number; digit: number };
  /** Candidates eliminated by this step (for pencil-mark reductions). */
  eliminations?: { cell: number; digit: number }[];
  /** Cells that justify the deduction (for highlighting in hints). */
  reason: number[];
  /** Human-readable explanation of the step. */
  explanation: string;
}

/** Result of grading a puzzle with the logical solver. */
export interface DifficultyReport {
  solved: boolean;
  band: DifficultyBand;
  score: number;
  hardestTechnique: Technique | null;
  techniqueCounts: Partial<Record<Technique, number>>;
}

/** A validated, ready-to-play puzzle. */
export interface PuzzleRecord {
  /** Stable identifier (hash of the puzzle string). */
  id: string;
  /** 81-char puzzle string using digits and `.` for blanks. */
  puzzle: string;
  /** 81-char unique solution string. */
  solution: string;
  difficulty: {
    band: DifficultyBand;
    score: number;
    hardestTechnique: Technique | null;
  };
  /** Where the puzzle came from. */
  source: 'dataset' | 'generated';
}
