"use client";

import { memo, useMemo } from "react";
import type { GameState, Settings } from "@/lib/game/types";
import { geoOf } from "@/lib/sudoku/grid";
import { findConflicts } from "@/lib/sudoku/validate";
import { Cell } from "./Cell";

// Fields are passed one by one (not the whole game) so the per-second timer tick does not re-render the board.
type BoardProps = Pick<GameState, "puzzle" | "solution" | "values" | "notes" | "selected" | "status" | "paused"> & {
  hintCell: number | null;
  settings: Settings;
  onSelect: (i: number) => void;
  onResume: () => void;
};

function BoardView(props: BoardProps) {
  const { values, notes, puzzle, solution, selected, status, paused, hintCell, settings, onSelect, onResume } = props;
  const conflicts = useMemo(() => (settings.showConflicts ? findConflicts(values) : null), [values, settings.showConflicts]);
  const geo = geoOf(puzzle);
  const selValue = selected !== null ? values[selected] : 0;
  const finished = status !== "playing";

  return (
    <div className="board-wrap relative mx-auto" style={{ ["--n" as string]: geo.size, ["--nb" as string]: geo.box }}>
      <div
        role="grid"
        aria-label={`Sudoku board, ${geo.size} by ${geo.size}`}
        style={{ gridTemplateColumns: `repeat(${geo.size}, minmax(0, 1fr))` }}
        className={`board grid h-full w-full overflow-hidden rounded-md border-2 border-slate-600 dark:border-slate-400 ${
          status === "won" ? "ring-4 ring-emerald-400" : ""
        } ${paused ? "blur-md" : ""}`}
      >
        {Array.from({ length: geo.cells }, (_, i) => {
          const isPeer =
            settings.highlightPeers &&
            selected !== null &&
            i !== selected &&
            (geo.rowOf(i) === geo.rowOf(selected) || geo.colOf(i) === geo.colOf(selected) || geo.boxOf(i) === geo.boxOf(selected));
          return (
            <Cell
              key={i}
              index={i}
              size={geo.size}
              value={paused ? 0 : values[i]}
              notes={paused ? 0 : notes[i]}
              given={puzzle[i] !== 0}
              selected={!finished && i === selected}
              peer={!finished && isPeer}
              sameValue={settings.highlightMatching && selValue !== 0 && values[i] === selValue && i !== selected}
              conflict={!!conflicts?.[i]}
              wrong={settings.checkMistakes && values[i] !== 0 && puzzle[i] === 0 && values[i] !== solution[i]}
              noteFocus={settings.highlightMatching ? selValue : 0}
              hinted={hintCell === i}
              onSelect={onSelect}
            />
          );
        })}
      </div>
      {paused && (
        <button
          type="button"
          onClick={onResume}
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-lg font-semibold text-slate-800 dark:text-slate-100"
        >
          <span className="rounded-full bg-blue-600 px-6 py-3 text-white shadow-lg">Resume</span>
          <span className="text-sm font-normal">Paused</span>
        </button>
      )}
    </div>
  );
}

export const Board = memo(BoardView);
