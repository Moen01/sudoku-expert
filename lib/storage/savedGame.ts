/** Persistence and validation of the active game. */

import { CELL_COUNT } from '../sudoku/constants';
import { isValidSolution } from '../sudoku/validation';
import type { GameState, Move } from '../game/state';
import { StorageKeys, readJSON, removeKey, writeJSON } from './storage';

interface SavedGameEnvelope {
  version: number;
  savedAt: number;
  state: GameState;
}

const SAVE_VERSION = 1;

function isNumberArray(value: unknown, length: number): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === length &&
    value.every((n) => typeof n === 'number' && Number.isFinite(n))
  );
}

function isValidMove(value: unknown): value is Move {
  if (typeof value !== 'object' || value === null) return false;
  const m = value as Record<string, unknown>;
  return (
    typeof m.cell === 'number' &&
    m.cell >= 0 &&
    m.cell < CELL_COUNT &&
    typeof m.prevValue === 'number' &&
    typeof m.nextValue === 'number' &&
    typeof m.prevNote === 'number' &&
    typeof m.nextNote === 'number'
  );
}

/**
 * Validate that an arbitrary parsed object is a usable {@link GameState}.
 * Rejects anything structurally wrong or internally inconsistent (e.g. an
 * invalid solution, or clues that don't match the solution).
 */
export function isValidGameState(value: unknown): value is GameState {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as Record<string, unknown>;

  if (typeof s.puzzleId !== 'string') return false;
  if (!isNumberArray(s.givens, CELL_COUNT)) return false;
  if (!isNumberArray(s.solution, CELL_COUNT)) return false;
  if (!isNumberArray(s.values, CELL_COUNT)) return false;
  if (!isNumberArray(s.notes, CELL_COUNT)) return false;
  if (!(s.selected === null || (typeof s.selected === 'number' && s.selected >= 0 && s.selected < CELL_COUNT))) {
    return false;
  }
  if (typeof s.elapsedMs !== 'number' || s.elapsedMs < 0) return false;
  if (typeof s.mistakes !== 'number' || s.mistakes < 0) return false;
  if (s.status !== 'playing' && s.status !== 'completed' && s.status !== 'revealed') return false;
  if (!Array.isArray(s.history) || !s.history.every(isValidMove)) return false;
  if (!Array.isArray(s.future) || !s.future.every(isValidMove)) return false;

  // Semantic checks: the stored solution must be a real solution, and the
  // fixed clues must be consistent with it.
  const solution = s.solution as number[];
  const givens = s.givens as number[];
  if (!isValidSolution(solution)) return false;
  for (let i = 0; i < CELL_COUNT; i++) {
    if (givens[i] !== 0 && givens[i] !== solution[i]) return false;
  }
  return true;
}

export function saveGame(state: GameState): void {
  const envelope: SavedGameEnvelope = {
    version: SAVE_VERSION,
    savedAt: Date.now(),
    state,
  };
  writeJSON(StorageKeys.game, envelope);
}

export type LoadResult =
  | { status: 'ok'; state: GameState; savedAt: number }
  | { status: 'none' }
  | { status: 'corrupt' };

/**
 * Load the saved game. Returns `corrupt` (and clears the bad data) if the
 * stored payload fails validation, so callers can inform the user instead of
 * silently losing their place to a crash.
 */
export function loadGame(): LoadResult {
  const envelope = readJSON<SavedGameEnvelope>(StorageKeys.game);
  if (envelope === null) return { status: 'none' };

  if (
    typeof envelope !== 'object' ||
    typeof envelope.version !== 'number' ||
    envelope.version !== SAVE_VERSION ||
    !isValidGameState(envelope.state)
  ) {
    removeKey(StorageKeys.game);
    return { status: 'corrupt' };
  }

  return { status: 'ok', state: envelope.state, savedAt: envelope.savedAt };
}

export function clearSavedGame(): void {
  removeKey(StorageKeys.game);
}
