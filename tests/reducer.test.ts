import { describe, expect, it } from "vitest";
import { gameReducer, newGameState, type GameAction } from "@/lib/game/reducer";
import type { GameState } from "@/lib/game/types";
import { bit, geoOf } from "@/lib/sudoku/grid";
import { findConflicts } from "@/lib/sudoku/validate";
import { prepared } from "./helpers";

const opts = { checkMistakes: true, autoRemoveNotes: true };
const run = (s: GameState, ...actions: GameAction[]) => actions.reduce(gameReducer, s);
const fresh = (d: Parameters<typeof prepared>[0] = "easy") => newGameState(prepared(d), 0);
const emptyCell = (s: GameState) => s.puzzle.findIndex((v) => v === 0);
const givenCell = (s: GameState) => s.puzzle.findIndex((v) => v !== 0);
const wrongValue = (s: GameState, i: number) => (s.solution[i] % s.solution.length ** 0.5) + 1;
const peersOf = (s: GameState, i: number) => geoOf(s.puzzle).peers[i];

describe("game reducer", () => {
  it("never changes a given", () => {
    const s = fresh();
    const g = givenCell(s);
    const after = run(s, { type: "select", cell: g }, { type: "input", value: wrongValue(s, g), opts }, { type: "erase" });
    expect(after.values[g]).toBe(s.puzzle[g]);
    expect(after.undo).toHaveLength(0);
  });

  it("enters, toggles off and erases a value", () => {
    const s = fresh();
    const i = emptyCell(s);
    const v = s.solution[i];
    const a = run(s, { type: "select", cell: i }, { type: "input", value: v, opts });
    expect(a.values[i]).toBe(v);
    expect(run(a, { type: "input", value: v, opts }).values[i]).toBe(0);
    expect(run(a, { type: "erase" }).values[i]).toBe(0);
  });

  it("counts a wrong entry as a mistake only when checking is on", () => {
    const s = fresh();
    const i = emptyCell(s);
    const w = wrongValue(s, i);
    expect(run(s, { type: "select", cell: i }, { type: "input", value: w, opts }).mistakes).toBe(1);
    expect(run(s, { type: "select", cell: i }, { type: "input", value: w, opts: { ...opts, checkMistakes: false } }).mistakes).toBe(0);
  });

  it("separates rule conflicts from wrong-but-legal entries", () => {
    const s = fresh();
    const i = emptyCell(s);
    const peerGiven = peersOf(s, i).find((p) => s.puzzle[p] !== 0)!;
    const conflicting = run(s, { type: "select", cell: i }, { type: "input", value: s.puzzle[peerGiven], opts });
    expect(findConflicts(conflicting.values)[i]).toBe(true);
    expect(conflicting.values[i]).not.toBe(s.solution[i]);
  });

  it("toggles notes, and a final value clears the cell's notes and peer notes", () => {
    const s = fresh();
    const i = emptyCell(s);
    const v = s.solution[i];
    const peer = peersOf(s, i).find((p) => s.puzzle[p] === 0)!;
    let t = run(s, { type: "toggleNotesMode" }, { type: "select", cell: peer }, { type: "input", value: v, opts });
    t = run(t, { type: "select", cell: i }, { type: "input", value: v, opts }, { type: "input", value: 3, opts });
    expect(t.notes[i] & bit(v)).toBeTruthy();
    expect(t.notes[peer] & bit(v)).toBeTruthy();
    // toggle 3 off again
    t = run(t, { type: "input", value: 3, opts });
    expect(t.notes[i] & bit(3)).toBe(0);
    t = run(t, { type: "toggleNotesMode" }, { type: "input", value: v, opts });
    expect(t.values[i]).toBe(v);
    expect(t.notes[i]).toBe(0);
    expect(t.notes[peer] & bit(v)).toBe(0);
  });

  it("undo and redo restore values and notes exactly", () => {
    const s = fresh();
    const i = emptyCell(s);
    const v = s.solution[i];
    const peer = peersOf(s, i).find((p) => s.puzzle[p] === 0)!;
    const withNote = run(s, { type: "toggleNotesMode" }, { type: "select", cell: peer }, { type: "input", value: v, opts }, { type: "toggleNotesMode" });
    const placed = run(withNote, { type: "select", cell: i }, { type: "input", value: v, opts });
    const undone = run(placed, { type: "undo" });
    expect(undone.values).toEqual(withNote.values);
    expect(undone.notes).toEqual(withNote.notes);
    const redone = run(undone, { type: "redo" });
    expect(redone.values).toEqual(placed.values);
    expect(redone.notes).toEqual(placed.notes);
    // a new move clears redo
    expect(run(undone, { type: "select", cell: i }, { type: "input", value: v, opts }).redo).toHaveLength(0);
  });

  it("hints place correct values, and point at mistakes first", () => {
    let s = fresh("hard");
    for (let k = 0; k < 15; k++) {
      s = run(s, { type: "hint" });
      expect(s.values.every((v, i) => v === 0 || v === s.solution[i])).toBe(true);
    }
    expect(s.hintsUsed).toBe(15);
    const i = s.values.findIndex((v) => v === 0);
    const wrong = run(s, { type: "select", cell: i }, { type: "input", value: wrongValue(s, i), opts }, { type: "select", cell: null }, { type: "hint" });
    expect(wrong.selected).toBe(i);
    expect(wrong.lastHint?.message).toMatch(/wrong/);
  });

  it("hints solve an extreme puzzle to the end and win", () => {
    let s = fresh("extreme");
    for (let k = 0; k < 256 && s.status === "playing"; k++) s = run(s, { type: "hint" });
    expect(s.status).toBe("won");
    expect(s.values).toEqual(s.solution);
  });

  it("detects completion and then blocks input", () => {
    const s = fresh();
    let t = s;
    for (let i = 0; i < 256; i++) {
      if (s.puzzle[i] === 0) t = run(t, { type: "select", cell: i }, { type: "input", value: s.solution[i], opts });
    }
    expect(t.status).toBe("won");
    expect(t.completedAt).not.toBeNull();
    const i = emptyCell(s);
    expect(run(t, { type: "select", cell: i }, { type: "erase" }).values[i]).toBe(s.solution[i]);
  });

  it("timer only runs while playing and not paused, with a capped tick", () => {
    const s = fresh();
    expect(run(s, { type: "tick", ms: 1000 }).elapsedMs).toBe(1000);
    expect(run(s, { type: "tick", ms: 3_600_000 }).elapsedMs).toBe(5000);
    expect(run(s, { type: "setPaused", paused: true }, { type: "tick", ms: 1000 }).elapsedMs).toBe(0);
    expect(run(s, { type: "reveal" }, { type: "tick", ms: 1000 }).elapsedMs).toBe(0);
  });

  it("reveal and restart", () => {
    const s = fresh();
    const r = run(s, { type: "reveal" });
    expect(r.status).toBe("revealed");
    expect(r.values).toEqual(s.solution);
    const back = run(r, { type: "restart" });
    expect(back.status).toBe("playing");
    expect(back.values).toEqual(s.puzzle);
  });

  it("arrow movement wraps around the board", () => {
    const s = run(fresh(), { type: "select", cell: 0 }, { type: "moveSelection", dr: 0, dc: -1 });
    expect(s.selected).toBe(15);
  });
});

describe("game reducer on 9x9", () => {
  const nine = () => newGameState(prepared("classic-extreme"), 0);

  it("rejects symbols A-G", () => {
    const s = nine();
    const i = emptyCell(s);
    expect(run(s, { type: "select", cell: i }, { type: "input", value: 10, opts }).values[i]).toBe(0);
  });

  it("arrow movement wraps at 9 columns", () => {
    expect(run(nine(), { type: "select", cell: 8 }, { type: "moveSelection", dr: 0, dc: 1 }).selected).toBe(0);
    expect(run(nine(), { type: "select", cell: 0 }, { type: "moveSelection", dr: -1, dc: 0 }).selected).toBe(72);
  });

  it("auto-removes notes only in 9x9 peers", () => {
    const s = nine();
    const i = emptyCell(s);
    const v = s.solution[i];
    const peer = peersOf(s, i).find((p) => s.puzzle[p] === 0)!;
    let t = run(s, { type: "toggleNotesMode" }, { type: "select", cell: peer }, { type: "input", value: v, opts }, { type: "toggleNotesMode" });
    t = run(t, { type: "select", cell: i }, { type: "input", value: v, opts });
    expect(t.notes[peer] & bit(v)).toBe(0);
    expect(t.notes).toHaveLength(81);
  });

  it("hints solve a 9x9 extreme puzzle to the end", () => {
    let s = nine();
    for (let k = 0; k < 81 && s.status === "playing"; k++) s = run(s, { type: "hint" });
    expect(s.status).toBe("won");
  });
});
