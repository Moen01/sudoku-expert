"use client";

import { memo, type ReactNode } from "react";
import { BulbIcon, EraseIcon, PencilIcon, RedoIcon, UndoIcon } from "./icons";

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

function ToolButton(props: { label: string; icon: ReactNode; onPress: () => void; disabled?: boolean; active?: boolean; badge?: string }) {
  return (
    <button
      type="button"
      disabled={props.disabled}
      aria-pressed={props.active}
      onClick={props.onPress}
      className={`relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg text-xs font-medium active:scale-95 disabled:opacity-30 ${
        props.active ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100" : "text-slate-600 dark:text-slate-300"
      }`}
    >
      {props.icon}
      <span>{props.label}</span>
      {props.badge && (
        <span
          className={`absolute right-2 top-1 rounded-full px-1.5 text-[9px] font-bold ${
            props.active ? "bg-amber-500 text-white" : "bg-slate-300 text-slate-700 dark:bg-slate-600 dark:text-slate-100"
          }`}
        >
          {props.badge}
        </span>
      )}
    </button>
  );
}

function ToolbarView(p: ToolbarProps) {
  return (
    <div className="flex gap-1" role="toolbar" aria-label="Game tools">
      <ToolButton label="Undo" icon={<UndoIcon />} onPress={p.onUndo} disabled={p.disabled || !p.canUndo} />
      <ToolButton label="Redo" icon={<RedoIcon />} onPress={p.onRedo} disabled={p.disabled || !p.canRedo} />
      <ToolButton label="Erase" icon={<EraseIcon />} onPress={p.onErase} disabled={p.disabled} />
      <ToolButton
        label="Notes"
        icon={<PencilIcon />}
        onPress={p.onToggleNotes}
        disabled={p.disabled}
        active={p.notesMode}
        badge={p.notesMode ? "ON" : "OFF"}
      />
      <ToolButton label="Hint" icon={<BulbIcon />} onPress={p.onHint} disabled={p.disabled} />
    </div>
  );
}

export const Toolbar = memo(ToolbarView);
