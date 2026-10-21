// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import type { PuzzleRecord } from '../sudoku/types';
import { createGameState, gameReducer } from '../game/state';
import { clearSavedGame, isValidGameState, loadGame, saveGame } from './savedGame';
import { StorageKeys } from './storage';
import { defaultStats, loadStats, recordCompletion, recordReveal } from './stats';
import { addUsedId, loadQueue, loadUsedIds, saveQueue } from './puzzles';

const RECORD: PuzzleRecord = {
  id: 'storage-test',
  puzzle: '53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79',
  solution: '534678912672195348198342567859761423426853791713924856961537284287419635345286179',
  difficulty: { band: 'extreme', score: 150, hardestTechnique: 'xy-wing' },
  source: 'dataset',
};

beforeEach(() => {
  window.localStorage.clear();
});

describe('saved game round-trip', () => {
  it('returns none when nothing is stored', () => {
    expect(loadGame()).toEqual({ status: 'none' });
  });

  it('saves and restores a game exactly, including notes and history', () => {
    let state = createGameState(RECORD, 1000);
    const cell = state.values.findIndex((v) => v === 0);
    state = gameReducer(state, { type: 'SELECT', cell });
    state = gameReducer(state, { type: 'TOGGLE_NOTE', value: 4 });
    state = gameReducer(state, { type: 'ENTER_VALUE', value: 3 });
    state = gameReducer(state, { type: 'TICK', deltaMs: 5000 });
    saveGame(state);

    const result = loadGame();
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.state.values).toEqual(state.values);
    expect(result.state.notes).toEqual(state.notes);
    expect(result.state.history).toEqual(state.history);
    expect(result.state.elapsedMs).toBe(5000);
  });

  it('reports corruption and clears the key for invalid data', () => {
    window.localStorage.setItem(StorageKeys.game, '{"not":"a game"}');
    expect(loadGame()).toEqual({ status: 'corrupt' });
    expect(window.localStorage.getItem(StorageKeys.game)).toBeNull();
  });

  it('rejects a state whose solution is not a valid Sudoku solution', () => {
    const state = createGameState(RECORD, 0);
    const broken = { ...state, solution: new Array(81).fill(1) };
    expect(isValidGameState(broken)).toBe(false);
  });

  it('clears a saved game on request', () => {
    saveGame(createGameState(RECORD, 0));
    clearSavedGame();
    expect(loadGame()).toEqual({ status: 'none' });
  });
});

describe('stats', () => {
  it('starts from defaults', () => {
    expect(loadStats()).toEqual(defaultStats());
  });

  it('records completions, best time and streaks', () => {
    let stats = recordCompletion(defaultStats(), 120_000);
    stats = recordCompletion(stats, 90_000);
    expect(stats.completed).toBe(2);
    expect(stats.bestMs).toBe(90_000);
    expect(stats.totalMs).toBe(210_000);
    expect(stats.currentStreak).toBe(2);
    expect(stats.longestStreak).toBe(2);
    expect(loadStats().completed).toBe(2);
  });

  it('resets the streak on reveal', () => {
    let stats = recordCompletion(defaultStats(), 100_000);
    stats = recordReveal(stats);
    expect(stats.currentStreak).toBe(0);
    expect(stats.completed).toBe(1);
  });
});

describe('puzzle queue and used ids', () => {
  it('persists the queue and played ids', () => {
    saveQueue([RECORD]);
    expect(loadQueue()).toHaveLength(1);
    let used = loadUsedIds();
    expect(used).toEqual([]);
    used = addUsedId(used, 'abc');
    expect(loadUsedIds()).toEqual(['abc']);
  });

  it('ignores structurally invalid queue entries', () => {
    window.localStorage.setItem(StorageKeys.queue, JSON.stringify([{ id: 'x' }, RECORD]));
    expect(loadQueue()).toHaveLength(1);
  });
});
