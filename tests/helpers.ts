import bank from "@/lib/sudoku/bank.json";
import type { PuzzleBank } from "@/lib/sudoku/bank";
import { preparePuzzle } from "@/lib/sudoku/bank";
import type { Difficulty } from "@/lib/sudoku/difficulty";
import type { KeyValueStore } from "@/lib/storage/storage";

export const BANK = bank as PuzzleBank;

export const prepared = (d: Difficulty = "easy", index = 0, seed = 42) => preparePuzzle(BANK.puzzles[d][index], d, seed);

export function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}
