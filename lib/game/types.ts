import type { Difficulty } from "@/lib/sudoku/difficulty";
import type { Grid } from "@/lib/sudoku/grid";

export type GameStatus = "playing" | "won" | "revealed";

/** One cell before (v0, n0) and after (v1, n1) a move. n = notes bitmask. */
export interface CellChange {
  i: number;
  v0: number;
  v1: number;
  n0: number;
  n1: number;
}

/** A move can touch many cells (placing a digit also clears it from peer notes). */
export type Move = CellChange[];

export interface PuzzleMeta {
  bankId: string;
  seed: number;
  clues: number;
  tier: number;
  score: number;
}

export interface GameState {
  id: string;
  difficulty: Difficulty;
  puzzle: Grid;
  solution: Grid;
  values: Grid;
  notes: number[];
  selected: number | null;
  notesMode: boolean;
  elapsedMs: number;
  mistakes: number;
  hintsUsed: number;
  undo: Move[];
  redo: Move[];
  status: GameStatus;
  paused: boolean;
  meta: PuzzleMeta;
  createdAt: number;
  completedAt: number | null;
  /** Last hint text, shown under the board. Not part of the move history. */
  lastHint: { cell: number; message: string } | null;
}

export interface Settings {
  /** Count and mark entries that differ from the solution. */
  checkMistakes: boolean;
  /** Mark digits that repeat in a row, column or box. */
  showConflicts: boolean;
  highlightPeers: boolean;
  highlightMatching: boolean;
  /** Placing a digit removes it from notes in the same row, column and box. */
  autoRemoveNotes: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  checkMistakes: true,
  showConflicts: true,
  highlightPeers: true,
  highlightMatching: true,
  autoRemoveNotes: true,
};

export interface DifficultyStats {
  started: number;
  completed: number;
  bestMs: number | null;
  totalMs: number;
  currentStreak: number;
  longestStreak: number;
  recent: { ms: number; at: number; id: string; mistakes: number }[];
}

export type Stats = Record<Difficulty, DifficultyStats>;
