import { describe, expect, it } from 'vitest';
import { bit } from '../sudoku/constants';
import type { PuzzleRecord } from '../sudoku/types';
import { createGameState, gameReducer, type GameState } from './state';
import { getHint } from './hints';
import { getRemainingCounts } from './selectors';

const PUZZLE = '53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79';
const SOLUTION = '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

const RECORD: PuzzleRecord = {
  id: 'test-puzzle',
  puzzle: PUZZLE,
  solution: SOLUTION,
  difficulty: { band: 'extreme', score: 150, hardestTechnique: 'xy-wing' },
  source: 'dataset',
};

const firstEmpty = (state: GameState): number => state.values.findIndex((v) => v === 0);

function solveViaReducer(initial: GameState): GameState {
  let state = initial;
  for (let cell = 0; cell < 81; cell++) {
    if (state.givens[cell] !== 0) continue;
    state = gameReducer(state, { type: 'SELECT', cell });
    state = gameReducer(state, { type: 'ENTER_VALUE', value: state.solution[cell] });
  }
  return state;
}

describe('createGameState', () => {
  it('initializes from a puzzle record', () => {
    const state = createGameState(RECORD, 1000);
    expect(state.values).toEqual(state.givens);
    expect(state.status).toBe('playing');
    expect(state.givens[0]).toBe(5);
    expect(state.selected).toBe(firstEmpty(state));
  });
});

describe('gameReducer entry rules', () => {
  it('never modifies a given clue', () => {
    let state = createGameState(RECORD, 0);
    state = gameReducer(state, { type: 'SELECT', cell: 0 }); // a given (5)
    const after = gameReducer(state, { type: 'ENTER_VALUE', value: 9 });
    expect(after.values[0]).toBe(5);
    expect(after).toBe(state); // no-op returns same reference
  });

  it('records a mistake when the entry differs from the solution', () => {
    let state = createGameState(RECORD, 0);
    const cell = firstEmpty(state);
    const wrong = state.solution[cell] === 1 ? 2 : 1;
    state = gameReducer(state, { type: 'SELECT', cell });
    state = gameReducer(state, { type: 'ENTER_VALUE', value: wrong });
    expect(state.values[cell]).toBe(wrong);
    expect(state.mistakes).toBe(1);
  });

  it('does not record a mistake for a correct entry', () => {
    let state = createGameState(RECORD, 0);
    const cell = firstEmpty(state);
    state = gameReducer(state, { type: 'SELECT', cell });
    state = gameReducer(state, { type: 'ENTER_VALUE', value: state.solution[cell] });
    expect(state.mistakes).toBe(0);
  });

  it('toggles the same digit off', () => {
    let state = createGameState(RECORD, 0);
    const cell = firstEmpty(state);
    state = gameReducer(state, { type: 'SELECT', cell });
    state = gameReducer(state, { type: 'ENTER_VALUE', value: 4 });
    state = gameReducer(state, { type: 'ENTER_VALUE', value: 4 });
    expect(state.values[cell]).toBe(0);
  });
});

describe('pencil marks', () => {
  it('adds and removes notes and clears them when a value is entered', () => {
    let state = createGameState(RECORD, 0);
    const cell = firstEmpty(state);
    state = gameReducer(state, { type: 'SELECT', cell });
    state = gameReducer(state, { type: 'TOGGLE_NOTE', value: 1 });
    state = gameReducer(state, { type: 'TOGGLE_NOTE', value: 2 });
    expect(state.notes[cell]).toBe(bit(1) | bit(2));
    state = gameReducer(state, { type: 'TOGGLE_NOTE', value: 1 });
    expect(state.notes[cell]).toBe(bit(2));
    state = gameReducer(state, { type: 'ENTER_VALUE', value: state.solution[cell] });
    expect(state.notes[cell]).toBe(0);
  });
});

describe('undo / redo', () => {
  it('restores both values and notes across undo and redo', () => {
    let state = createGameState(RECORD, 0);
    const cell = firstEmpty(state);
    state = gameReducer(state, { type: 'SELECT', cell });
    state = gameReducer(state, { type: 'TOGGLE_NOTE', value: 3 });
    state = gameReducer(state, { type: 'ENTER_VALUE', value: 7 });
    expect(state.values[cell]).toBe(7);
    expect(state.notes[cell]).toBe(0);

    state = gameReducer(state, { type: 'UNDO' }); // undo the value -> note restored
    expect(state.values[cell]).toBe(0);
    expect(state.notes[cell]).toBe(bit(3));

    state = gameReducer(state, { type: 'UNDO' }); // undo the note
    expect(state.notes[cell]).toBe(0);

    state = gameReducer(state, { type: 'REDO' }); // redo the note
    expect(state.notes[cell]).toBe(bit(3));
    state = gameReducer(state, { type: 'REDO' }); // redo the value
    expect(state.values[cell]).toBe(7);
    expect(state.notes[cell]).toBe(0);
  });
});

describe('erase and restart', () => {
  it('erases user entries but a restart resets everything', () => {
    let state = createGameState(RECORD, 0);
    const cell = firstEmpty(state);
    state = gameReducer(state, { type: 'SELECT', cell });
    state = gameReducer(state, { type: 'ENTER_VALUE', value: 7 });
    state = gameReducer(state, { type: 'ERASE' });
    expect(state.values[cell]).toBe(0);
    state = gameReducer(state, { type: 'ENTER_VALUE', value: 2 });
    state = gameReducer(state, { type: 'RESTART', now: 10 });
    expect(state.values).toEqual(state.givens);
    expect(state.mistakes).toBe(0);
    expect(state.history).toHaveLength(0);
  });
});

describe('completion', () => {
  it('detects a correctly completed puzzle', () => {
    const state = solveViaReducer(createGameState(RECORD, 0));
    expect(state.status).toBe('completed');
  });

  it('counts remaining digits correctly once solved', () => {
    const state = solveViaReducer(createGameState(RECORD, 0));
    const remaining = getRemainingCounts(state);
    for (let d = 1; d <= 9; d++) expect(remaining[d]).toBe(0);
  });
});

describe('reveal and keyboard movement', () => {
  it('reveal fills the solution and marks the game revealed', () => {
    let state = createGameState(RECORD, 0);
    state = gameReducer(state, { type: 'REVEAL_SOLUTION' });
    expect(state.status).toBe('revealed');
    expect(state.values).toEqual(state.solution);
  });

  it('clamps arrow-key navigation to the board', () => {
    let state = createGameState(RECORD, 0);
    state = gameReducer(state, { type: 'SELECT', cell: 0 });
    state = gameReducer(state, { type: 'MOVE_SELECTION', dRow: -1, dCol: -1 });
    expect(state.selected).toBe(0);
    state = gameReducer(state, { type: 'MOVE_SELECTION', dRow: 1, dCol: 1 });
    expect(state.selected).toBe(10);
  });
});

describe('hints', () => {
  it('flags an incorrect entry as a mistake hint', () => {
    let state = createGameState(RECORD, 0);
    const cell = firstEmpty(state);
    const wrong = state.solution[cell] === 1 ? 2 : 1;
    state = gameReducer(state, { type: 'SELECT', cell });
    state = gameReducer(state, { type: 'ENTER_VALUE', value: wrong });
    const hint = getHint(state);
    expect(hint.kind).toBe('mistake');
    expect(hint.cell).toBe(cell);
  });

  it('suggests a solution-consistent placement for a clean board', () => {
    const state = createGameState(RECORD, 0);
    const hint = getHint(state);
    expect(hint.value).toBeDefined();
    expect(state.solution[hint.cell]).toBe(hint.value);
  });
});
