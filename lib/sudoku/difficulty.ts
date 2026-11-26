import type { BoardSize } from "./grid";
import type { Grade } from "./logic";

/** Four 16x16 levels, plus classic 9x9 which only comes in Extreme. */
export type Difficulty = "easy" | "medium" | "hard" | "extreme" | "classic-extreme";

export const DIFFICULTY_ORDER: readonly Difficulty[] = ["easy", "medium", "hard", "extreme", "classic-extreme"];

export interface DifficultyRule {
  size: BoardSize;
  /** Short level name, e.g. "Extreme". */
  label: string;
  /** Name with board size, e.g. "16×16 Extreme". */
  fullLabel: string;
  /** What the player needs, shown in the UI. */
  summary: string;
  /** Hardest technique tier the digger may require (5 = beyond the logic solver). */
  digMaxTier: number;
  /** Digger stops at this clue count, so easier levels keep more givens. */
  digMinClues: number;
  /** Accepted when grade.maxTier is in [minTier, maxTier]. */
  minTier: number;
  maxTier: number;
}

/**
 * Difficulty is measured, not labelled: every bank puzzle is solved by the
 * logic solver in lib/sudoku/logic.ts and classified by the hardest
 * technique tier it needed. See README "Difficulty classification".
 */
export const DIFFICULTY_RULES: Record<Difficulty, DifficultyRule> = {
  easy: {
    size: 16,
    label: "Easy",
    fullLabel: "16×16 Easy",
    summary: "Singles only, many givens",
    digMaxTier: 1,
    digMinClues: 136,
    minTier: 1,
    maxTier: 1,
  },
  medium: {
    size: 16,
    label: "Medium",
    fullLabel: "16×16 Medium",
    summary: "Needs pointing, box/line or pairs",
    digMaxTier: 2,
    digMinClues: 112,
    minTier: 2,
    maxTier: 2,
  },
  hard: {
    size: 16,
    label: "Hard",
    fullLabel: "16×16 Hard",
    summary: "Needs triples, quads, X-Wing or Swordfish",
    digMaxTier: 4,
    digMinClues: 0,
    minTier: 3,
    maxTier: 4,
  },
  extreme: {
    size: 16,
    label: "Extreme",
    fullLabel: "16×16 Extreme",
    summary: "Beyond Swordfish: chains or trial and error",
    digMaxTier: 5,
    digMinClues: 0,
    minTier: 5,
    maxTier: 5,
  },
  // On 9x9, tier 4 (fish) is rare, so Extreme = fish or beyond. ~1 in 5 dug puzzles qualifies.
  "classic-extreme": {
    size: 9,
    label: "Extreme",
    fullLabel: "9×9 Extreme",
    summary: "Needs X-Wing, Swordfish or harder (XY-Wing, chains)",
    digMaxTier: 5,
    digMinClues: 0,
    minTier: 4,
    maxTier: 5,
  },
};

export function matchesDifficulty(g: Grade, d: Difficulty): boolean {
  const rule = DIFFICULTY_RULES[d];
  return g.maxTier >= rule.minTier && g.maxTier <= rule.maxTier;
}

export const isDifficulty = (x: unknown): x is Difficulty =>
  typeof x === "string" && (DIFFICULTY_ORDER as readonly string[]).includes(x);
