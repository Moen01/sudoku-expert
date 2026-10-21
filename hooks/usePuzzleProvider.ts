import { useCallback, useEffect, useRef } from 'react';
import { pickPuzzle } from '@/lib/game/puzzleSource';
import type { PuzzleRecord } from '@/lib/sudoku/types';
import { addUsedId, loadQueue, loadUsedIds, saveQueue } from '@/lib/storage/puzzles';
import type { WorkerResponse } from '@/workers/generator.worker';

const QUEUE_TARGET = 6;

/**
 * Supplies validated Extreme puzzles and keeps a small background-generated
 * queue topped up via a Web Worker. Everything is held in refs so queue churn
 * never triggers re-renders; the bundled dataset is always the fallback.
 */
export function usePuzzleProvider(): {
  takePuzzle: () => PuzzleRecord;
  refill: () => void;
} {
  const usedRef = useRef<string[]>([]);
  const queueRef = useRef<PuzzleRecord[]>([]);
  const workerRef = useRef<Worker | null>(null);

  const refill = useCallback(() => {
    const worker = workerRef.current;
    if (!worker) return;
    const need = QUEUE_TARGET - queueRef.current.length;
    if (need > 0) {
      worker.postMessage({ type: 'generate', count: need });
    }
  }, []);

  useEffect(() => {
    usedRef.current = loadUsedIds();
    queueRef.current = loadQueue();

    try {
      const worker = new Worker(new URL('../workers/generator.worker.ts', import.meta.url));
      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const data = event.data;
        if (data.type !== 'puzzle') return;
        const record = data.record;
        const used = new Set(usedRef.current);
        const known = new Set(queueRef.current.map((p) => p.id));
        if (used.has(record.id) || known.has(record.id)) return;
        queueRef.current = [...queueRef.current, record].slice(-QUEUE_TARGET * 2);
        saveQueue(queueRef.current);
      };
      workerRef.current = worker;
    } catch {
      // Worker unsupported/blocked — dataset-only mode still works.
      workerRef.current = null;
    }

    refill();
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [refill]);

  const takePuzzle = useCallback((): PuzzleRecord => {
    const result = pickPuzzle(usedRef.current, queueRef.current);
    if (result.recycled) usedRef.current = [];
    usedRef.current = addUsedId(usedRef.current, result.record.id);
    queueRef.current = result.queue;
    saveQueue(queueRef.current);
    // Kick the worker to backfill what we just consumed.
    refill();
    return result.record;
  }, [refill]);

  return { takePuzzle, refill };
}
