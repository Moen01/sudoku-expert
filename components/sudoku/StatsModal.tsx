'use client';

import { formatTime } from '@/lib/game/selectors';
import type { Stats } from '@/lib/storage/stats';
import { Modal } from './Modal';

interface StatsModalProps {
  open: boolean;
  stats: Stats;
  onClose: () => void;
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex flex-col items-center rounded-xl p-3"
      style={{ background: 'var(--surface-2)' }}
    >
      <span className="text-lg font-bold tabular-nums">{value}</span>
      <span className="text-center text-[0.7rem]" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
    </div>
  );
}

export function StatsModal({ open, stats, onClose }: StatsModalProps) {
  const avgMs =
    stats.times.length > 0
      ? Math.round(stats.times.reduce((a, b) => a + b, 0) / stats.times.length)
      : null;

  return (
    <Modal open={open} title="Statistics" onClose={onClose}>
      <div className="grid grid-cols-2 gap-2">
        <StatTile label="Completed" value={String(stats.completed)} />
        <StatTile label="Best time" value={stats.bestMs !== null ? formatTime(stats.bestMs) : '—'} />
        <StatTile label="Average time" value={avgMs !== null ? formatTime(avgMs) : '—'} />
        <StatTile label="Total time" value={formatTime(stats.totalMs)} />
        <StatTile label="Current streak" value={String(stats.currentStreak)} />
        <StatTile label="Longest streak" value={String(stats.longestStreak)} />
      </div>
      {stats.completed === 0 && (
        <p className="mt-4 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          Solve your first Extreme puzzle to start building stats.
        </p>
      )}
    </Modal>
  );
}
