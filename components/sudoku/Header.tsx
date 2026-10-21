'use client';

import { formatTime } from '@/lib/game/selectors';
import { StatsIcon } from './icons';

interface HeaderProps {
  elapsedMs: number;
  mistakes: number;
  hintsUsed: number;
  onStats: () => void;
}

function Stat({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="flex flex-col items-center leading-tight">
      <span
        className="tabular-nums font-semibold"
        style={{ color: danger ? 'var(--danger)' : 'var(--text)', fontSize: '1rem' }}
      >
        {value}
      </span>
      <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>{label}</span>
    </div>
  );
}

export function Header({ elapsedMs, mistakes, hintsUsed, onStats }: HeaderProps) {
  return (
    <header className="flex w-full items-center justify-between">
      <div className="flex flex-col">
        <h1 className="text-lg font-bold leading-none" style={{ color: 'var(--text)' }}>
          Sudoku <span style={{ color: 'var(--accent)' }}>Expert</span>
        </h1>
        <span
          className="mt-1 w-fit rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          Extreme
        </span>
      </div>

      <div className="flex items-center gap-4">
        <Stat label="Time" value={formatTime(elapsedMs)} />
        <Stat label="Mistakes" value={String(mistakes)} danger={mistakes > 0} />
        <Stat label="Hints" value={String(hintsUsed)} />
        <button
          type="button"
          onClick={onStats}
          aria-label="Statistics"
          className="flex items-center justify-center rounded-xl p-2 transition active:scale-95"
          style={{ background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--board-line)' }}
        >
          <StatsIcon />
        </button>
      </div>
    </header>
  );
}
