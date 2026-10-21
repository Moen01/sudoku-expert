'use client';

import type { ReactNode } from 'react';
import { EyeIcon, NewIcon, RestartIcon } from './icons';

interface ActionButtonProps {
  label: string;
  icon: ReactNode;
  onClick: () => void;
}

function ActionButton({ label, icon, onClick }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition active:scale-95"
      style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--board-line)' }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

interface ActionBarProps {
  onNew: () => void;
  onRestart: () => void;
  onReveal: () => void;
}

export function ActionBar({ onNew, onRestart, onReveal }: ActionBarProps) {
  return (
    <div className="flex w-full gap-2">
      <ActionButton label="New" icon={<NewIcon />} onClick={onNew} />
      <ActionButton label="Restart" icon={<RestartIcon />} onClick={onRestart} />
      <ActionButton label="Solution" icon={<EyeIcon />} onClick={onReveal} />
    </div>
  );
}
