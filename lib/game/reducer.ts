import type { PreparedPuzzle } from "@/lib/sudoku/bank";
import { bit, geoOf } from "@/lib/sudoku/grid";
import { findHint } from "@/lib/sudoku/hint";
import type { CellChange, GameState, Move, Settings } from "./types";

/** Older moves are dropped so a long game cannot fill localStorage. */
export const MAX_HISTORY = 1000;

export type InputOptions = Pick<Settings, "checkMistakes" | "autoRemoveNotes">;

export type GameAction =
  | { type: "select"; cell: number | null }
  | { type: "moveSelection"; dr: number; dc: number }
  | { type: "input"; value: number; opts: InputOptions }
  | { type: "erase" }
  | { type: "toggleNotesMode" }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "hint" }
  | { type: "dismissHint" }
  | { type: "reveal" }
  | { type: "restart" }
  | { type: "tick"; ms: number }
  | { type: "setPaused"; paused: boolean };

export function newGameState(p: PreparedPuzzle, now: number): GameState {
  return {
    id: p.id,
    difficulty: p.difficulty,
    puzzle: p.puzzle,
    solution: p.solution,
    values: p.puzzle.slice(),
    notes: new Array<number>(p.puzzle.length).fill(0),
    selected: null,
    notesMode: false,
    elapsedMs: 0,
    mistakes: 0,
    hintsUsed: 0,
    undo: [],
    redo: [],
    status: "playing",
    paused: false,
    meta: { bankId: p.bankId, seed: p.seed, clues: p.clues, tier: p.tier, score: p.score },
    createdAt: now,
    completedAt: null,
    lastHint: null,
  };
}

const isSolved = (s: GameState): boolean => s.values.every((v, i) => v === s.solution[i]);

function applyChanges(s: GameState, changes: Move, dir: "forward" | "back"): Pick<GameState, "values" | "notes"> {
  const values = s.values.slice();
  const notes = s.notes.slice();
  for (const c of changes) {
    values[c.i] = dir === "forward" ? c.v1 : c.v0;
    notes[c.i] = dir === "forward" ? c.n1 : c.n0;
  }
  return { values, notes };
}

/** Apply a new move, record it for undo, clear redo, and check for a win. */
function commit(s: GameState, move: Move, extra: Partial<GameState> = {}): GameState {
  const changes = move.filter((c) => c.v0 !== c.v1 || c.n0 !== c.n1);
  if (changes.length === 0) return { ...s, ...extra };
  const undo = [...s.undo, changes].slice(-MAX_HISTORY);
  const next: GameState = { ...s, ...applyChanges(s, changes, "forward"), undo, redo: [], ...extra };
  return withWinCheck(next);
}

function withWinCheck(s: GameState): GameState {
  if (s.status === "playing" && isSolved(s)) {
    return { ...s, status: "won", completedAt: Date.now(), notesMode: false, paused: false };
  }
  return s;
}

function placeValue(s: GameState, cell: number, value: number, autoRemoveNotes: boolean): Move {
  const move: CellChange[] = [{ i: cell, v0: s.values[cell], v1: value, n0: s.notes[cell], n1: 0 }];
  if (autoRemoveNotes && value) {
    const b = bit(value);
    for (const p of geoOf(s.puzzle).peers[cell]) {
      if (s.notes[p] & b) move.push({ i: p, v0: s.values[p], v1: s.values[p], n0: s.notes[p], n1: s.notes[p] & ~b });
    }
  }
  return move;
}

const canEdit = (s: GameState, cell: number | null): cell is number =>
  s.status === "playing" && !s.paused && cell !== null && s.puzzle[cell] === 0;

export function gameReducer(s: GameState, a: GameAction): GameState {
  switch (a.type) {
    case "select":
      return s.selected === a.cell ? s : { ...s, selected: a.cell };

    case "moveSelection": {
      const { size } = geoOf(s.puzzle);
      const cur = s.selected ?? 0;
      const r = (Math.floor(cur / size) + a.dr + size) % size;
      const c = ((cur % size) + a.dc + size) % size;
      return { ...s, selected: s.selected === null ? 0 : r * size + c };
    }

    case "input": {
      const cell = s.selected;
      // Also rejects A-G on a 9x9 board.
      if (!canEdit(s, cell) || a.value < 1 || a.value > geoOf(s.puzzle).size) return s;
      if (s.notesMode) {
        if (s.values[cell]) return s; // notes only go in empty cells
        const n1 = s.notes[cell] ^ bit(a.value);
        return commit(s, [{ i: cell, v0: 0, v1: 0, n0: s.notes[cell], n1 }], { lastHint: null });
      }
      // Tapping the digit already in the cell clears it (toggle).
      if (s.values[cell] === a.value) {
        return commit(s, [{ i: cell, v0: a.value, v1: 0, n0: s.notes[cell], n1: 0 }], { lastHint: null });
      }
      const wrong = a.opts.checkMistakes && s.solution[cell] !== a.value;
      return commit(s, placeValue(s, cell, a.value, a.opts.autoRemoveNotes), {
        mistakes: s.mistakes + (wrong ? 1 : 0),
        lastHint: null,
      });
    }

    case "erase": {
      const cell = s.selected;
      if (!canEdit(s, cell)) return s;
      return commit(s, [{ i: cell, v0: s.values[cell], v1: 0, n0: s.notes[cell], n1: 0 }], { lastHint: null });
    }

    case "toggleNotesMode":
      return s.status === "playing" ? { ...s, notesMode: !s.notesMode } : s;

    case "undo": {
      if (s.status !== "playing" || s.paused || s.undo.length === 0) return s;
      const move = s.undo[s.undo.length - 1];
      return {
        ...s,
        ...applyChanges(s, move, "back"),
        undo: s.undo.slice(0, -1),
        redo: [...s.redo, move],
        selected: move[0].i,
        lastHint: null,
      };
    }

    case "redo": {
      if (s.status !== "playing" || s.paused || s.redo.length === 0) return s;
      const move = s.redo[s.redo.length - 1];
      return withWinCheck({
        ...s,
        ...applyChanges(s, move, "forward"),
        redo: s.redo.slice(0, -1),
        undo: [...s.undo, move].slice(-MAX_HISTORY),
        selected: move[0].i,
        lastHint: null,
      });
    }

    case "hint": {
      if (s.status !== "playing" || s.paused) return s;
      const hint = findHint(s.values, s.solution);
      if (!hint) return s;
      if (hint.kind === "mistake") {
        return { ...s, selected: hint.cell, lastHint: { cell: hint.cell, message: hint.message } };
      }
      return commit(s, placeValue(s, hint.cell, hint.value, true), {
        selected: hint.cell,
        hintsUsed: s.hintsUsed + 1,
        lastHint: { cell: hint.cell, message: hint.message },
      });
    }

    case "dismissHint":
      return s.lastHint ? { ...s, lastHint: null } : s;

    case "reveal":
      if (s.status !== "playing") return s;
      return {
        ...s,
        values: s.solution.slice(),
        notes: new Array<number>(s.puzzle.length).fill(0),
        status: "revealed",
        completedAt: Date.now(),
        undo: [],
        redo: [],
        paused: false,
        notesMode: false,
        lastHint: null,
      };

    case "restart":
      return {
        ...s,
        values: s.puzzle.slice(),
        notes: new Array<number>(s.puzzle.length).fill(0),
        selected: null,
        notesMode: false,
        elapsedMs: 0,
        mistakes: 0,
        hintsUsed: 0,
        undo: [],
        redo: [],
        status: "playing",
        paused: false,
        completedAt: null,
        lastHint: null,
      };

    case "tick":
      if (s.status !== "playing" || s.paused || a.ms <= 0) return s;
      // Cap one tick so a suspended tab that wakes up late cannot add hours.
      return { ...s, elapsedMs: s.elapsedMs + Math.min(a.ms, 5_000) };

    case "setPaused":
      if (s.status !== "playing" || s.paused === a.paused) return s;
      return { ...s, paused: a.paused };
  }
}
