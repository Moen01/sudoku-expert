import { describe, expect, it } from "vitest";
import { gameReducer, newGameState } from "@/lib/game/reducer";
import { recordLoss, recordStart, recordWin } from "@/lib/game/stats";
import { KEYS, loadGame, loadRecentIds, loadSettings, loadStats, rememberBankId, saveGame, saveSettings, saveStats, validateGame } from "@/lib/storage/storage";
import { DEFAULT_SETTINGS } from "@/lib/game/types";
import { memoryStore, prepared } from "./helpers";

const opts = { checkMistakes: true, autoRemoveNotes: true };

function playedGame() {
  let s = newGameState(prepared("medium"), 1);
  const empties = s.puzzle.map((v, i) => (v === 0 ? i : -1)).filter((i) => i >= 0);
  s = gameReducer(s, { type: "select", cell: empties[0] });
  s = gameReducer(s, { type: "input", value: s.solution[empties[0]], opts });
  s = gameReducer(s, { type: "toggleNotesMode" });
  s = gameReducer(s, { type: "select", cell: empties[1] });
  s = gameReducer(s, { type: "input", value: 4, opts });
  s = gameReducer(s, { type: "input", value: 9, opts });
  s = gameReducer(s, { type: "undo" });
  s = gameReducer(s, { type: "tick", ms: 4321 });
  return s;
}

describe("game persistence", () => {
  it("restores board, notes, history, timer and counters", () => {
    const store = memoryStore();
    const s = playedGame();
    expect(saveGame(s, store)).toBe(true);
    const r = loadGame(store);
    expect(r.kind).toBe("restored");
    if (r.kind !== "restored") return;
    expect(r.game.values).toEqual(s.values);
    expect(r.game.notes).toEqual(s.notes);
    expect(r.game.undo).toEqual(s.undo);
    expect(r.game.redo).toEqual(s.redo);
    expect(r.game.elapsedMs).toBe(4321);
    expect(r.game.selected).toBe(s.selected);
    // redo still works after restore
    expect(gameReducer(r.game, { type: "redo" }).notes).toEqual(gameReducer(s, { type: "redo" }).notes);
  });

  it("returns 'none' when nothing is saved", () => {
    expect(loadGame(memoryStore()).kind).toBe("none");
  });

  it("does not restore a finished game as unfinished", () => {
    const store = memoryStore();
    saveGame(gameReducer(playedGame(), { type: "reveal" }), store);
    expect(loadGame(store).kind).toBe("finished");
  });

  it("reports corrupt data instead of crashing", () => {
    const store = memoryStore();
    store.setItem(KEYS.game, "{not json");
    expect(loadGame(store).kind).toBe("corrupt");
    store.setItem(KEYS.game, JSON.stringify({ v: 1, savedAt: 0, data: { id: "x" } }));
    expect(loadGame(store).kind).toBe("corrupt");
    store.setItem(KEYS.game, JSON.stringify({ v: 99, savedAt: 0, data: playedGame() }));
    expect(loadGame(store).kind).toBe("corrupt");
  });

  it("rejects a save where a given was changed", () => {
    const s = playedGame();
    const g = s.puzzle.findIndex((v) => v !== 0);
    const values = s.values.slice();
    values[g] = (values[g] % 16) + 1;
    expect(validateGame({ ...s, values }).ok).toBe(false);
  });

  it("restores a 9x9 game", () => {
    const store = memoryStore();
    let s = newGameState(prepared("classic-extreme"), 1);
    const i = s.puzzle.findIndex((v) => v === 0);
    s = gameReducer(s, { type: "select", cell: i });
    s = gameReducer(s, { type: "input", value: s.solution[i], opts });
    saveGame(s, store);
    const r = loadGame(store);
    expect(r.kind).toBe("restored");
    if (r.kind === "restored") expect(r.game.values).toEqual(s.values);
  });

  it("rejects a save whose grid size does not match its difficulty", () => {
    const s = newGameState(prepared("classic-extreme"), 1);
    expect(validateGame({ ...s, difficulty: "extreme" }).ok).toBe(false);
  });

  it("survives a throwing localStorage", () => {
    const broken = { getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("quota"); }, removeItem: () => {} };
    expect(saveGame(playedGame(), broken)).toBe(false);
    expect(loadGame(broken).kind).toBe("corrupt");
    expect(loadSettings(broken)).toEqual(DEFAULT_SETTINGS);
  });
});

describe("settings, stats, recent ids", () => {
  it("merges saved settings with defaults", () => {
    const store = memoryStore();
    saveSettings({ ...DEFAULT_SETTINGS, checkMistakes: false }, store);
    expect(loadSettings(store).checkMistakes).toBe(false);
    expect(loadSettings(store).showConflicts).toBe(true);
  });

  it("adds empty 9x9 stats to stats saved before 9x9 existed", () => {
    const store = memoryStore();
    const old = loadStats(store);
    const { "classic-extreme": _drop, ...withoutNine } = old;
    void _drop;
    store.setItem(KEYS.stats, JSON.stringify({ v: 1, savedAt: 0, data: withoutNine }));
    expect(loadStats(store)["classic-extreme"].completed).toBe(0);
  });

  it("tracks wins, best time and streaks", () => {
    const store = memoryStore();
    let st = loadStats(store);
    st = recordStart(st, "hard");
    st = recordWin(st, "hard", 9000, "a", 1, 0);
    st = recordWin(st, "hard", 7000, "b", 0, 1);
    st = recordLoss(st, "hard", 500);
    st = recordWin(st, "hard", 8000, "c", 0, 2);
    saveStats(st, store);
    const h = loadStats(store).hard;
    expect(h.completed).toBe(3);
    expect(h.bestMs).toBe(7000);
    expect(h.totalMs).toBe(24500);
    expect(h.currentStreak).toBe(1);
    expect(h.longestStreak).toBe(2);
    expect(h.recent.map((r) => r.id)).toEqual(["c", "b", "a"]);
  });

  it("keeps recent bank ids unique, newest first", () => {
    const store = memoryStore();
    rememberBankId("A", store);
    rememberBankId("B", store);
    rememberBankId("A", store);
    expect(loadRecentIds(store)).toEqual(["A", "B"]);
  });
});
