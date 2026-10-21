/// <reference lib="webworker" />

/**
 * Background puzzle generator. Generation (digging + grading) is CPU-intensive,
 * so it runs off the main thread to keep the UI responsive. The worker is a
 * best-effort enhancement that tops up the puzzle queue; the app works fully
 * without it using the bundled dataset.
 */

import { generatePuzzle } from '../lib/sudoku/generator';
import type { PuzzleRecord } from '../lib/sudoku/types';

interface GenerateRequest {
  type: 'generate';
  count: number;
}

export type WorkerResponse =
  | { type: 'puzzle'; record: PuzzleRecord }
  | { type: 'done' };

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (event: MessageEvent<GenerateRequest>) => {
  const { type, count } = event.data;
  if (type !== 'generate') return;

  for (let i = 0; i < count; i++) {
    const record = generatePuzzle({ minBand: 'extreme', maxAttempts: 150 });
    if (record) {
      ctx.postMessage({ type: 'puzzle', record } satisfies WorkerResponse);
    }
  }
  ctx.postMessage({ type: 'done' } satisfies WorkerResponse);
};
