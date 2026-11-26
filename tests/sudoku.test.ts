import { describe, expect, it } from "vitest";
import { G16, G9, geoOf, parseGrid, serializeGrid, symbolOf, valueFromKey } from "@/lib/sudoku/grid";
const CELLS = G16.cells;
import { countSolutions, makeRng, solve } from "@/lib/sudoku/solver";
import { findConflicts, isSolvedGrid, puzzleMatchesSolution } from "@/lib/sudoku/validate";
import { generateSolution } from "@/lib/sudoku/generator";
import { applyTransform, randomTransform } from "@/lib/sudoku/transform";
import { BANK, prepared } from "./helpers";

describe("grid", () => {
  it("has 48 units and 39 peers per cell on 16x16", () => {
    expect(G16.units).toHaveLength(48);
    expect(G16.peers.every((p) => p.length === 39)).toBe(true);
  });
  it("has 27 units and 20 peers per cell on 9x9", () => {
    expect(G9.units).toHaveLength(27);
    expect(G9.peers.every((p) => p.length === 20)).toBe(true);
    expect(G9.boxOf(80)).toBe(8);
  });
  it("picks geometry from grid length and rejects other lengths", () => {
    expect(geoOf(new Array(81).fill(0))).toBe(G9);
    expect(geoOf(new Array(256).fill(0))).toBe(G16);
    expect(() => geoOf(new Array(100).fill(0))).toThrow();
  });
  it("maps symbols 1-9 and A-G", () => {
    expect(symbolOf(9)).toBe("9");
    expect(symbolOf(10)).toBe("A");
    expect(symbolOf(16)).toBe("G");
    expect(valueFromKey("g")).toBe(16);
    expect(valueFromKey("H")).toBeNull();
    expect(valueFromKey("0")).toBeNull();
  });
  it("round-trips serialisation", () => {
    const s = BANK.puzzles.hard[0].puzzle;
    expect(serializeGrid(parseGrid(s))).toBe(s);
  });
  it("rejects bad grid strings", () => {
    expect(() => parseGrid("123")).toThrow();
    expect(() => parseGrid("H".repeat(CELLS))).toThrow();
    // A-G are not valid on 9x9
    expect(() => parseGrid("A" + ".".repeat(80))).toThrow();
  });
});

describe("validation", () => {
  it("accepts a generated full grid", () => {
    expect(isSolvedGrid(generateSolution(makeRng(1), G16))).toBe(true);
    expect(isSolvedGrid(generateSolution(makeRng(1), G9))).toBe(true);
  });
  it("finds row conflicts", () => {
    const g = new Array(CELLS).fill(0);
    g[0] = 5;
    g[15] = 5;
    const c = findConflicts(g);
    expect(c[0] && c[15]).toBe(true);
    expect(c.filter(Boolean)).toHaveLength(2);
  });
  it("rejects a puzzle whose given contradicts the solution", () => {
    const p = prepared();
    const bad = p.puzzle.slice();
    const i = bad.findIndex((v) => v !== 0);
    bad[i] = (bad[i] % 16) + 1;
    expect(puzzleMatchesSolution(bad, p.solution)).toBe(false);
  });
});

describe("solver", () => {
  it("solves a puzzle and keeps the givens", () => {
    const p = prepared("extreme");
    const r = solve(p.puzzle);
    expect(r.solution && isSolvedGrid(r.solution)).toBe(true);
    expect(puzzleMatchesSolution(p.puzzle, r.solution!)).toBe(true);
  });
  it("reports 0 solutions for an invalid puzzle", () => {
    const g = new Array(CELLS).fill(0);
    g[0] = 1;
    g[1] = 1;
    expect(countSolutions(g)).toBe(0);
  });
  it("reports multiple solutions for an almost-empty grid", () => {
    expect(countSolutions(new Array(CELLS).fill(0))).toBe(2);
  });
  it("detects non-uniqueness after removing many clues", () => {
    const p = prepared("easy");
    const sparse = p.puzzle.map((v, i) => (i < 128 ? 0 : v));
    expect(countSolutions(sparse)).toBe(2);
  });
});

describe("transform", () => {
  it("keeps validity and uniqueness", () => {
    const p = prepared("hard");
    const t = randomTransform(makeRng(7), G16);
    const puzzle = applyTransform(p.puzzle, t);
    const solution = applyTransform(p.solution, t);
    expect(puzzleMatchesSolution(puzzle, solution)).toBe(true);
    expect(countSolutions(puzzle)).toBe(1);
  });
});

describe("9x9", () => {
  it("solver solves a classic extreme puzzle uniquely", () => {
    const p = prepared("classic-extreme");
    expect(p.puzzle).toHaveLength(81);
    expect(countSolutions(p.puzzle)).toBe(1);
    expect(puzzleMatchesSolution(p.puzzle, p.solution)).toBe(true);
  });
  it("finds conflicts in a 3x3 box", () => {
    const g = new Array(81).fill(0);
    g[0] = 4;
    g[20] = 4; // row 2, col 2: same box as cell 0
    expect(findConflicts(g)[20]).toBe(true);
  });
  it("rejects a 9x9 puzzle checked against a 16x16 solution", () => {
    expect(puzzleMatchesSolution(prepared("classic-extreme").puzzle, prepared("easy").solution)).toBe(false);
  });
});
