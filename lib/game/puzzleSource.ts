/**
 * Chooses the next Extreme puzzle.
 *
 * Priority:
 *   1. A freshly worker-generated puzzle from the queue (maximum variety).
 *   2. A bundled dataset puzzle not played recently.
 *   3. If every dataset puzzle has been played, reset the played set and reuse.
 *
 * The bundled dataset guarantees a valid Extreme puzzle is always available
 * instantly and fully offline, independent of any network or worker.
 */

import datasetRaw from '@/data/extreme-puzzles.json';
import type { PuzzleRecord } from '../sudoku/types';

export const DATASET: readonly PuzzleRecord[] = datasetRaw as PuzzleRecord[];

export interface PickResult {
  record: PuzzleRecord;
  fromQueue: boolean;
  /** Queue with the chosen puzzle removed (unchanged if it came from the dataset). */
  queue: PuzzleRecord[];
  /** Whether the played-ids set was reset because every puzzle was exhausted. */
  recycled: boolean;
}

function randomOf<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function pickPuzzle(usedIds: readonly string[], queue: readonly PuzzleRecord[]): PickResult {
  const used = new Set(usedIds);

  const queueCandidate = queue.find((p) => !used.has(p.id));
  if (queueCandidate) {
    return {
      record: queueCandidate,
      fromQueue: true,
      queue: queue.filter((p) => p.id !== queueCandidate.id),
      recycled: false,
    };
  }

  const fresh = DATASET.filter((p) => !used.has(p.id));
  if (fresh.length > 0) {
    return { record: randomOf(fresh), fromQueue: false, queue: [...queue], recycled: false };
  }

  // Everything has been played — recycle the dataset.
  return { record: randomOf(DATASET), fromQueue: false, queue: [...queue], recycled: true };
}

export function datasetSize(): number {
  return DATASET.length;
}
