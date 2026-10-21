'use client';

import { formatTime } from '@/lib/game/selectors';
import type { Stats } from '@/lib/storage/stats';
import { Modal } from './Modal';
import { TrophyIcon } from './icons';

interface CompletionModalProps {
  open: boolean;
  elapsedMs: number;
  mistakes: number;
  hintsUsed: number;
  stats: Stats;
  onNewGame: () => void;
  onClose: () => void;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

export function CompletionModal(props: CompletionModalProps) {
  const { open, elapsedMs, mistakes, hintsUsed, stats, onNewGame, onClose } = props;
  const isBest = stats.bestMs !== null && elapsedMs <= stats.bestMs;

  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex flex-col items-center text-center">
        <div
          className="mb-3 flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
        >
          <TrophyIcon width={28} height={28} />
        </div>
        <h2 className="text-xl font-bold">Puzzle solved!</h2>
        <p className="mb-4 text-sm" style={{ color: 'var(--text-muted)' }}>
          {isBest ? 'A new personal best — brilliant.' : 'Another Extreme puzzle conquered.'}
        </p>

        <div className="w-full text-sm">
          <Row label="Time" value={formatTime(elapsedMs)} />
          <Row label="Mistakes" value={String(mistakes)} />
          <Row label="Hints used" value={String(hintsUsed)} />
          <Row label="Best time" value={stats.bestMs !== null ? formatTime(stats.bestMs) : '—'} />
          <Row label="Current streak" value={String(stats.currentStreak)} />
          <Row label="Completed" value={String(stats.completed)} />
        </div>

        <button
          type="button"
          onClick={onNewGame}
          className="mt-5 w-full rounded-xl py-3 font-semibold text-white transition active:scale-95"
          style={{ background: 'var(--accent)' }}
        >
          New Extreme puzzle
        </button>
      </div>
    </Modal>
  );
}
