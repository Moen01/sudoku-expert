/** Persistence for the worker-generated puzzle queue and the played-ids set. */

import type { PuzzleRecord } from '../sudoku/types';
import { StorageKeys, readJSON, writeJSON } from './storage';

const MAX_USED_IDS = 1000;

function isPuzzleRecord(value: unknown): value is PuzzleRecord {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.puzzle === 'string' &&
    r.puzzle.length === 81 &&
    typeof r.solution === 'string' &&
    r.solution.length === 81 &&
    typeof r.difficulty === 'object' &&
    r.difficulty !== null
  );
}

export function loadUsedIds(): string[] {
  const stored = readJSON<string[]>(StorageKeys.used);
  if (!Array.isArray(stored) || !stored.every((id) => typeof id === 'string')) return [];
  return stored;
}

export function addUsedId(ids: string[], id: string): string[] {
  const next = ids.includes(id) ? ids : [...ids, id];
  const capped = next.slice(-MAX_USED_IDS);
  writeJSON(StorageKeys.used, capped);
  return capped;
}

export function loadQueue(): PuzzleRecord[] {
  const stored = readJSON<unknown[]>(StorageKeys.queue);
  if (!Array.isArray(stored)) return [];
  return stored.filter(isPuzzleRecord);
}

export function saveQueue(queue: PuzzleRecord[]): void {
  writeJSON(StorageKeys.queue, queue);
}
