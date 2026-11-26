"use client";

import { memo } from "react";
import { bit, symbolOf, type BoardSize } from "@/lib/sudoku/grid";

export interface CellProps {
  index: number;
  size: BoardSize;
  value: number;
  notes: number;
  given: boolean;
  selected: boolean;
  peer: boolean;
  sameValue: boolean;
  conflict: boolean;
  wrong: boolean;
  /** Digit to emphasise inside the notes (the selected cell's value). */
  noteFocus: number;
  hinted: boolean;
  onSelect: (i: number) => void;
}

const NOTE_SLOTS: Record<BoardSize, number[]> = {
  9: Array.from({ length: 9 }, (_, k) => k + 1),
  16: Array.from({ length: 16 }, (_, k) => k + 1),
};

function cellBackground(p: CellProps): string {
  if (p.selected) return "bg-blue-300 dark:bg-sky-700";
  if (p.conflict) return "bg-red-100 dark:bg-red-950";
  if (p.hinted) return "bg-amber-100 dark:bg-amber-900/60";
  if (p.sameValue) return "bg-blue-100 dark:bg-sky-900/70";
  if (p.peer) return "bg-slate-100 dark:bg-slate-800";
  return "bg-white dark:bg-slate-900";
}

function textColor(p: CellProps): string {
  if (p.wrong || (p.conflict && !p.given)) return "text-red-600 dark:text-red-400";
  if (p.given) return "text-slate-900 dark:text-slate-100 font-bold";
  return "text-blue-600 dark:text-sky-400 font-semibold";
}

function CellView(p: CellProps) {
  const size = p.size;
  const box = size === 9 ? 3 : 4;
  const r = Math.floor(p.index / size);
  const c = p.index % size;
  // Thick lines between boxes, thin lines elsewhere.
  const right = c === size - 1 ? "" : (c + 1) % box === 0 ? "border-r-2 border-r-slate-500 dark:border-r-slate-400" : "border-r border-r-slate-200 dark:border-r-slate-700";
  const bottom = r === size - 1 ? "" : (r + 1) % box === 0 ? "border-b-2 border-b-slate-500 dark:border-b-slate-400" : "border-b border-b-slate-200 dark:border-b-slate-700";

  const label = p.value
    ? `Row ${r + 1}, column ${c + 1}, ${symbolOf(p.value)}${p.given ? ", given" : ""}`
    : `Row ${r + 1}, column ${c + 1}, empty`;

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={p.selected}
      onPointerDown={(e) => {
        // pointerdown feels instant on touch; prevent the focus ring and the delayed click.
        e.preventDefault();
        p.onSelect(p.index);
      }}
      onClick={() => p.onSelect(p.index)}
      className={`relative flex aspect-square items-center justify-center p-0 leading-none outline-none ${right} ${bottom} ${cellBackground(p)}`}
    >
      {p.value ? (
        <span className={`cell-value ${textColor(p)}`}>{symbolOf(p.value)}</span>
      ) : p.notes ? (
        <span className={`grid h-full w-full ${size === 9 ? "grid-cols-3 grid-rows-3" : "grid-cols-4 grid-rows-4"}`}>
          {NOTE_SLOTS[size].map((v) => (
            <span
              key={v}
              className={`cell-note flex items-center justify-center ${
                p.notes & bit(v)
                  ? v === p.noteFocus
                    ? "font-bold text-blue-700 dark:text-sky-300"
                    : "text-slate-500 dark:text-slate-400"
                  : "invisible"
              }`}
            >
              {symbolOf(v)}
            </span>
          ))}
        </span>
      ) : null}
    </button>
  );
}

export const Cell = memo(CellView);
