"use client";

import { memo, useMemo } from "react";
import { symbolOf, type BoardSize } from "@/lib/sudoku/grid";

interface NumberPadProps {
  size: BoardSize;
  values: number[];
  notesMode: boolean;
  disabled: boolean;
  onInput: (v: number) => void;
}

function NumberPadView({ size, values, notesMode, disabled, onInput }: NumberPadProps) {
  // How many of each symbol are still missing (`size` of each in a solved grid).
  const remaining = useMemo(() => {
    const left = new Array<number>(size + 1).fill(size);
    for (const v of values) if (v) left[v]--;
    return left;
  }, [values, size]);
  const digits = useMemo(() => Array.from({ length: size }, (_, k) => k + 1), [size]);

  return (
    // 16 symbols: 2 rows of 8. 9 symbols: 1 row of 9 with taller keys.
    <div className={`grid gap-1.5 ${size === 9 ? "grid-cols-9" : "grid-cols-8"}`} role="group" aria-label="Number pad">
      {digits.map((v) => {
        const done = remaining[v] <= 0;
        return (
          <button
            key={v}
            type="button"
            disabled={disabled || (done && !notesMode)}
            aria-label={`${notesMode ? "Note" : "Enter"} ${symbolOf(v)}, ${Math.max(0, remaining[v])} left`}
            onClick={() => onInput(v)}
            className={`flex ${size === 9 ? "h-16" : "h-12"} flex-col items-center justify-center rounded-lg border text-xl font-semibold transition-colors active:scale-95 disabled:opacity-30 ${
              notesMode
                ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
                : "border-slate-200 bg-white text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:text-sky-300"
            }`}
          >
            <span className="leading-none">{symbolOf(v)}</span>
            <span className="mt-0.5 text-[10px] font-normal leading-none text-slate-400">{done ? "✓" : remaining[v]}</span>
          </button>
        );
      })}
    </div>
  );
}

export const NumberPad = memo(NumberPadView);
