/**
 * Hint logic. A hint always reflects the validated solution and, where
 * possible, explains the logical technique behind the next move rather than
 * revealing a random digit.
 */

import { cellLabel } from '../sudoku/grid';
import { findNextPlacement } from '../sudoku/logicalSolver';
import type { Technique } from '../sudoku/types';
import { getWrongCells } from './selectors';
import type { GameState } from './state';

export interface Hint {
  kind: 'mistake' | 'technique' | 'reveal';
  cell: number;
  /** Correct value to place (absent for `mistake` hints). */
  value?: number;
  technique?: Technique;
  message: string;
  /** Cells to highlight as the justification for this hint. */
  reasonCells: number[];
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

export function getHint(state: GameState): Hint {
  // 1. Point out an existing incorrect entry before suggesting new moves.
  const wrong = getWrongCells(state);
  if (wrong.size > 0) {
    const cell = [...wrong][0];
    return {
      kind: 'mistake',
      cell,
      message: `${cellLabel(cell)} doesn't match the solution. Remove it before continuing.`,
      reasonCells: [cell],
    };
  }

  // 2. Find the next logically forced placement and explain it.
  const placement = findNextPlacement(state.values);
  if (placement) {
    const base = `Place ${placement.digit} in ${cellLabel(placement.cell)}. ${placement.explanation}`;
    const message = placement.enabledBy
      ? `${placement.enabledBy.explanation} ${lowerFirst(base)}`
      : base;
    const reasonCells = [
      placement.cell,
      ...placement.reason,
      ...(placement.enabledBy?.reason ?? []),
    ];
    return {
      kind: 'technique',
      cell: placement.cell,
      value: placement.digit,
      technique: placement.enabledBy?.technique ?? placement.technique,
      message,
      reasonCells,
    };
  }

  // 3. Fallback: reveal a correct digit for any empty cell.
  const empty = state.values.findIndex((v) => v === 0);
  if (empty !== -1) {
    const value = state.solution[empty];
    return {
      kind: 'reveal',
      cell: empty,
      value,
      message: `Place ${value} in ${cellLabel(empty)}.`,
      reasonCells: [empty],
    };
  }

  // Board already complete.
  return { kind: 'reveal', cell: state.selected ?? 0, message: 'The puzzle is already solved.', reasonCells: [] };
}
