'use client';

import type { ReactNode } from 'react';
import { EraseIcon, HintIcon, PencilIcon, RedoIcon, UndoIcon } from './icons';

interface ToolButtonProps {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  badge?: string;
}

function ToolButton({ label, icon, onClick, disabled, active, badge }: ToolButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className="relative flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2 text-xs font-medium transition active:scale-95 disabled:opacity-30"
      style={{
        background: active ? 'var(--accent-soft)' : 'var(--surface)',
        color: active ? 'var(--accent)' : 'var(--text-muted)',
        border: '1px solid var(--board-line)',
        minHeight: 56,
      }}
    >
      {icon}
      <span>{label}</span>
      {badge ? (
        <span
          className="absolute right-1 top-1 rounded-full px-1 text-[0.6rem] font-semibold"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}

interface ToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  notesMode: boolean;
  disabled: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onErase: () => void;
  onToggleNotes: () => void;
  onHint: () => void;
}

export function Toolbar(props: ToolbarProps) {
  return (
    <div className="flex w-full gap-1" role="group" aria-label="Tools">
      <ToolButton label="Undo" icon={<UndoIcon />} onClick={props.onUndo} disabled={props.disabled || !props.canUndo} />
      <ToolButton label="Redo" icon={<RedoIcon />} onClick={props.onRedo} disabled={props.disabled || !props.canRedo} />
      <ToolButton label="Erase" icon={<EraseIcon />} onClick={props.onErase} disabled={props.disabled} />
      <ToolButton
        label="Notes"
        icon={<PencilIcon />}
        onClick={props.onToggleNotes}
        active={props.notesMode}
        badge={props.notesMode ? 'ON' : undefined}
        disabled={props.disabled}
      />
      <ToolButton label="Hint" icon={<HintIcon />} onClick={props.onHint} disabled={props.disabled} />
    </div>
  );
}
