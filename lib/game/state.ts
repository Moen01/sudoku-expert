/**
 * Game state model and reducer.
 *
 * State updates are centralized in {@link gameReducer} so behaviour stays
 * predictable and fully serializable (every field survives a save/restore).
 * Side effects (persistence, stats, timer ticks) live in the hooks layer.
 */

import { CELL_COUNT, SIZE } from '../sudoku/constants';
import { parseGrid } from '../sudoku/grid';
import { bit } from '../sudoku/constants';
import type { DifficultyBand, PuzzleRecord } from '../sudoku/types';

export type GameStatus = 'playing' | 'completed' | 'revealed';

/** A single reversible change to one cell. */
export interface Move {
  cell: number;
  prevValue: number;
  nextValue: number;
  prevNote: number;
  nextNote: number;
}

export interface GameState {
  puzzleId: string;
  band: DifficultyBand;
  score: number;
  /** Original clues — never mutated; `givens[i] !== 0` marks a fixed cell. */
  givens: number[];
  /** The validated unique solution. */
  solution: number[];
  /** Current board values (includes givens). */
  values: number[];
  /** Pencil marks per cell, as 9-bit masks. */
  notes: number[];
  selected: number | null;
  elapsedMs: number;
  mistakes: number;
  hintsUsed: number;
  status: GameStatus;
  history: Move[];
  future: Move[];
  createdAt: number;
  updatedAt: number;
}

export type GameAction =
  | { type: 'LOAD'; state: GameState }
  | { type: 'NEW_GAME'; puzzle: PuzzleRecord; now: number }
  | { type: 'SELECT'; cell: number | null }
  | { type: 'MOVE_SELECTION'; dRow: number; dCol: number }
  | { type: 'ENTER_VALUE'; value: number }
  | { type: 'TOGGLE_NOTE'; value: number }
  | { type: 'ERASE' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'TICK'; deltaMs: number }
  | { type: 'RESTART'; now: number }
  | { type: 'REVEAL_SOLUTION' }
  | { type: 'APPLY_HINT'; cell: number; value: number };

export function createGameState(puzzle: PuzzleRecord, now: number): GameState {
  const givens = parseGrid(puzzle.puzzle);
  const solution = parseGrid(puzzle.solution);
  const selected = givens.findIndex((v) => v === 0);
  return {
    puzzleId: puzzle.id,
    band: puzzle.difficulty.band,
    score: puzzle.difficulty.score,
    givens,
    solution,
    values: givens.slice(),
    notes: new Array<number>(CELL_COUNT).fill(0),
    selected: selected === -1 ? null : selected,
    elapsedMs: 0,
    mistakes: 0,
    hintsUsed: 0,
    status: 'playing',
    history: [],
    future: [],
    createdAt: now,
    updatedAt: now,
  };
}

const isGiven = (state: GameState, cell: number): boolean => state.givens[cell] !== 0;

function isSolved(values: number[], solution: number[]): boolean {
  for (let i = 0; i < CELL_COUNT; i++) {
    if (values[i] !== solution[i]) return false;
  }
  return true;
}

/** Apply a single-cell change, recording it in history and clearing redo. */
function commitMove(
  state: GameState,
  move: Move,
  now: number,
  options: { addMistake?: boolean; addHint?: boolean } = {},
): GameState {
  const values = state.values.slice();
  const notes = state.notes.slice();
  values[move.cell] = move.nextValue;
  notes[move.cell] = move.nextNote;

  const solved = isSolved(values, solution(state));
  return {
    ...state,
    values,
    notes,
    selected: move.cell,
    mistakes: state.mistakes + (options.addMistake ? 1 : 0),
    hintsUsed: state.hintsUsed + (options.addHint ? 1 : 0),
    status: solved ? 'completed' : 'playing',
    history: [...state.history, move],
    future: [],
    updatedAt: now,
  };
}

const solution = (state: GameState): number[] => state.solution;

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'LOAD':
      return action.state;

    case 'NEW_GAME':
      return createGameState(action.puzzle, action.now);

    case 'SELECT':
      return { ...state, selected: action.cell };

    case 'MOVE_SELECTION': {
      const current = state.selected ?? 0;
      const row = Math.floor(current / SIZE);
      const col = current % SIZE;
      const nextRow = Math.min(SIZE - 1, Math.max(0, row + action.dRow));
      const nextCol = Math.min(SIZE - 1, Math.max(0, col + action.dCol));
      return { ...state, selected: nextRow * SIZE + nextCol };
    }

    case 'ENTER_VALUE': {
      const cell = state.selected;
      if (cell === null || isGiven(state, cell) || state.status === 'revealed') return state;
      // Tapping the digit already present clears it (toggle-off).
      const nextValue = state.values[cell] === action.value ? 0 : action.value;
      const move: Move = {
        cell,
        prevValue: state.values[cell],
        nextValue,
        prevNote: state.notes[cell],
        nextNote: 0,
      };
      if (move.prevValue === move.nextValue && move.prevNote === move.nextNote) return state;
      const addMistake = nextValue !== 0 && nextValue !== state.solution[cell];
      return commitMove(state, move, Date.now(), { addMistake });
    }

    case 'TOGGLE_NOTE': {
      const cell = state.selected;
      if (cell === null || isGiven(state, cell) || state.status === 'revealed') return state;
      if (state.values[cell] !== 0) return state; // can't pencil over a final value
      const move: Move = {
        cell,
        prevValue: 0,
        nextValue: 0,
        prevNote: state.notes[cell],
        nextNote: state.notes[cell] ^ bit(action.value),
      };
      return commitMove(state, move, Date.now());
    }

    case 'ERASE': {
      const cell = state.selected;
      if (cell === null || isGiven(state, cell) || state.status === 'revealed') return state;
      if (state.values[cell] === 0 && state.notes[cell] === 0) return state;
      const move: Move = {
        cell,
        prevValue: state.values[cell],
        nextValue: 0,
        prevNote: state.notes[cell],
        nextNote: 0,
      };
      return commitMove(state, move, Date.now());
    }

    case 'APPLY_HINT': {
      if (isGiven(state, action.cell)) return state;
      const move: Move = {
        cell: action.cell,
        prevValue: state.values[action.cell],
        nextValue: action.value,
        prevNote: state.notes[action.cell],
        nextNote: 0,
      };
      return commitMove(state, move, Date.now(), { addHint: true });
    }

    case 'UNDO': {
      if (state.history.length === 0) return state;
      const move = state.history[state.history.length - 1];
      const values = state.values.slice();
      const notes = state.notes.slice();
      values[move.cell] = move.prevValue;
      notes[move.cell] = move.prevNote;
      return {
        ...state,
        values,
        notes,
        selected: move.cell,
        status: isSolved(values, state.solution) ? 'completed' : 'playing',
        history: state.history.slice(0, -1),
        future: [...state.future, move],
        updatedAt: Date.now(),
      };
    }

    case 'REDO': {
      if (state.future.length === 0) return state;
      const move = state.future[state.future.length - 1];
      const values = state.values.slice();
      const notes = state.notes.slice();
      values[move.cell] = move.nextValue;
      notes[move.cell] = move.nextNote;
      return {
        ...state,
        values,
        notes,
        selected: move.cell,
        status: isSolved(values, state.solution) ? 'completed' : 'playing',
        history: [...state.history, move],
        future: state.future.slice(0, -1),
        updatedAt: Date.now(),
      };
    }

    case 'TICK':
      if (state.status !== 'playing') return state;
      return { ...state, elapsedMs: state.elapsedMs + action.deltaMs };

    case 'RESTART': {
      const selected = state.givens.findIndex((v) => v === 0);
      return {
        ...state,
        values: state.givens.slice(),
        notes: new Array<number>(CELL_COUNT).fill(0),
        selected: selected === -1 ? null : selected,
        elapsedMs: 0,
        mistakes: 0,
        hintsUsed: 0,
        status: 'playing',
        history: [],
        future: [],
        updatedAt: action.now,
      };
    }

    case 'REVEAL_SOLUTION':
      return {
        ...state,
        values: state.solution.slice(),
        notes: new Array<number>(CELL_COUNT).fill(0),
        selected: null,
        status: 'revealed',
        history: [],
        future: [],
        updatedAt: Date.now(),
      };

    default:
      return state;
  }
}

/**
 * Reducer that tolerates a not-yet-initialized (`null`) state, used by the
 * React hook before the first puzzle is loaded.
 */
export function rootReducer(state: GameState | null, action: GameAction): GameState | null {
  if (action.type === 'LOAD') return action.state;
  if (action.type === 'NEW_GAME') return createGameState(action.puzzle, action.now);
  if (state === null) return null;
  return gameReducer(state, action);
}
