/** Pure derived-state helpers used by the board and controls. */

import { PEERS, SIZE, boxOf, colOf, digitsFromMask, rowOf } from '../sudoku/constants';
import { findConflicts } from '../sudoku/validation';
import type { GameState } from './state';

export interface Highlight {
  /** Cells sharing a row, column or box with the selected cell. */
  peers: Set<number>;
  /** Cells whose value equals the selected cell's value (same-number highlight). */
  sameValue: Set<number>;
  /** The digit in the selected cell, or 0. */
  selectedValue: number;
}

export function getHighlight(state: GameState): Highlight {
  const peers = new Set<number>();
  const sameValue = new Set<number>();
  const selected = state.selected;
  if (selected === null) {
    return { peers, sameValue, selectedValue: 0 };
  }
  for (const peer of PEERS[selected]) peers.add(peer);
  const selectedValue = state.values[selected];
  if (selectedValue !== 0) {
    for (let i = 0; i < state.values.length; i++) {
      if (state.values[i] === selectedValue) sameValue.add(i);
    }
  }
  return { peers, sameValue, selectedValue };
}

export function getConflicts(state: GameState): Set<number> {
  return findConflicts(state.values);
}

/** Cells whose final value differs from the solution (actual mistakes). */
export function getWrongCells(state: GameState): Set<number> {
  const wrong = new Set<number>();
  for (let i = 0; i < state.values.length; i++) {
    if (state.values[i] !== 0 && state.values[i] !== state.solution[i]) wrong.add(i);
  }
  return wrong;
}

/** Remaining count per digit (how many of each 1‑9 are still unplaced). */
export function getRemainingCounts(state: GameState): number[] {
  const counts = new Array<number>(SIZE + 1).fill(0);
  for (const value of state.values) {
    if (value !== 0) counts[value]++;
  }
  const remaining = new Array<number>(SIZE + 1).fill(0);
  for (let d = 1; d <= SIZE; d++) remaining[d] = SIZE - counts[d];
  return remaining;
}

export function notesToDigits(mask: number): number[] {
  return digitsFromMask(mask);
}

export function isBoardFull(state: GameState): boolean {
  return state.values.every((v) => v !== 0);
}

export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

/** Thick borders between 3×3 boxes, for rendering. */
export function cellBorders(cell: number): { top: boolean; left: boolean; right: boolean; bottom: boolean } {
  const r = rowOf(cell);
  const c = colOf(cell);
  return {
    top: r % 3 === 0,
    left: c % 3 === 0,
    right: c === SIZE - 1,
    bottom: r === SIZE - 1,
  };
}

export { boxOf, rowOf, colOf };
