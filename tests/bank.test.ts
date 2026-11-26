import { describe, expect, it } from "vitest";
import { DIFFICULTY_ORDER, matchesDifficulty } from "@/lib/sudoku/difficulty";
import { DIFFICULTY_RULES } from "@/lib/sudoku/difficulty";
import { geoOf, parseGrid } from "@/lib/sudoku/grid";
import { grade } from "@/lib/sudoku/logic";
import { countSolutions, makeRng } from "@/lib/sudoku/solver";
import { pickEntry, preparePuzzle } from "@/lib/sudoku/bank";
import { applyTransform, randomTransform } from "@/lib/sudoku/transform";
import { BANK } from "./helpers";

describe("puzzle bank", () => {
  for (const d of DIFFICULTY_ORDER) {
    it(`every ${d} puzzle is unique and graded ${d}`, () => {
      const entries = BANK.puzzles[d];
      expect(entries.length).toBeGreaterThanOrEqual(20);
      for (const e of entries) {
        const g = parseGrid(e.puzzle);
        expect(g.length, e.id).toBe(DIFFICULTY_RULES[d].size ** 2);
        expect(countSolutions(g, 5_000_000), e.id).toBe(1);
        expect(matchesDifficulty(grade(g), d), e.id).toBe(true);
      }
    });
  }

  it("has no duplicate puzzles", () => {
    const all = DIFFICULTY_ORDER.flatMap((d) => BANK.puzzles[d].map((e) => e.puzzle));
    expect(new Set(all).size).toBe(all.length);
  });

  it("transforms keep the measured difficulty", () => {
    for (const d of DIFFICULTY_ORDER) {
      const g = parseGrid(BANK.puzzles[d][1].puzzle);
      const t = applyTransform(g, randomTransform(makeRng(99), geoOf(g)));
      expect(grade(t).maxTier).toBe(grade(g).maxTier);
    }
  });

  it("preparePuzzle gives distinct ids for distinct seeds", () => {
    const e = BANK.puzzles.medium[0];
    expect(preparePuzzle(e, "medium", 1).id).not.toBe(preparePuzzle(e, "medium", 2).id);
  });

  it("pickEntry avoids recently played entries", () => {
    const entries = BANK.puzzles.easy.slice(0, 3);
    const rng = makeRng(3);
    for (let k = 0; k < 20; k++) {
      expect(pickEntry(entries, [entries[0].id, entries[1].id], rng).id).toBe(entries[2].id);
    }
  });
});
