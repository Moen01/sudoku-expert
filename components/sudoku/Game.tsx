"use client";

import { useCallback, useEffect, useState } from "react";
import { useGame } from "@/hooks/useGame";
import { formatTime } from "@/lib/game/format";
import { DIFFICULTY_RULES, type Difficulty } from "@/lib/sudoku/difficulty";
import { cellName, geoOf, symbolOf, valueFromKey, valuesOf } from "@/lib/sudoku/grid";
import { Board } from "./Board";
import { MenuIcon, PauseIcon, PlayIcon } from "./icons";
import { CompletionSheet, ConfirmSheet, MenuSheet, NewGameSheet, SettingsSheet, StatsSheet } from "./Menus";
import { NumberPad } from "./NumberPad";
import { Toolbar } from "./Toolbar";

type SheetKind = "menu" | "new" | "stats" | "settings" | "restart" | "reveal" | "abandon";

export function Game() {
  const { game, settings, stats, notice, loading, dispatch, newGame, updateSettings, dismissNotice } = useGame();
  const [sheet, setSheet] = useState<SheetKind | null>(null);
  const [pendingDifficulty, setPendingDifficulty] = useState<Difficulty | null>(null);
  const [dismissedWinFor, setDismissedWinFor] = useState<string | null>(null);

  const { checkMistakes, autoRemoveNotes } = settings;
  const onSelect = useCallback((i: number) => dispatch({ type: "select", cell: i }), [dispatch]);
  const onInput = useCallback(
    (value: number) => dispatch({ type: "input", value, opts: { checkMistakes, autoRemoveNotes } }),
    [dispatch, checkMistakes, autoRemoveNotes],
  );
  const onResume = useCallback(() => dispatch({ type: "setPaused", paused: false }), [dispatch]);
  const onUndo = useCallback(() => dispatch({ type: "undo" }), [dispatch]);
  const onRedo = useCallback(() => dispatch({ type: "redo" }), [dispatch]);
  const onErase = useCallback(() => dispatch({ type: "erase" }), [dispatch]);
  const onToggleNotes = useCallback(() => dispatch({ type: "toggleNotesMode" }), [dispatch]);
  const onHint = useCallback(() => dispatch({ type: "hint" }), [dispatch]);

  // Physical keyboard support. Disabled while a sheet is open.
  useEffect(() => {
    if (sheet) return;
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();
      if (mod && k === "z") {
        e.preventDefault();
        dispatch({ type: e.shiftKey ? "redo" : "undo" });
        return;
      }
      if (mod && k === "y") {
        e.preventDefault();
        dispatch({ type: "redo" });
        return;
      }
      if (mod || e.altKey) return;
      const moves: Record<string, [number, number]> = {
        ArrowUp: [-1, 0],
        ArrowDown: [1, 0],
        ArrowLeft: [0, -1],
        ArrowRight: [0, 1],
      };
      if (moves[e.key]) {
        e.preventDefault();
        dispatch({ type: "moveSelection", dr: moves[e.key][0], dc: moves[e.key][1] });
      } else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
        e.preventDefault();
        dispatch({ type: "erase" });
      } else if (k === "n") {
        dispatch({ type: "toggleNotesMode" });
      } else if (e.key === "Escape") {
        dispatch({ type: "select", cell: null });
      } else {
        const v = valueFromKey(e.key);
        if (v !== null) onInput(v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheet, dispatch, onInput]);

  const close = useCallback(() => setSheet(null), []);

  const requestNewGame = (d: Difficulty) => {
    if (game && game.status === "playing" && game.undo.length > 0) {
      setPendingDifficulty(d);
      setSheet("abandon");
    } else {
      setSheet(null);
      void newGame(d);
    }
  };

  if (!game) {
    return (
      <main className="app flex flex-col items-center justify-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        <p className="text-slate-500">{loading ? "Preparing puzzle…" : notice}</p>
        {!loading && (
          <button type="button" className="rounded-lg bg-blue-600 px-4 py-2 text-white" onClick={() => void newGame("medium")}>
            Try again
          </button>
        )}
      </main>
    );
  }

  const playing = game.status === "playing";
  const size = geoOf(game.puzzle).size;
  const rule = DIFFICULTY_RULES[game.difficulty];
  const selNotes = game.selected !== null && !game.values[game.selected] ? game.notes[game.selected] : 0;
  const infoLine = game.lastHint
    ? `💡 ${game.lastHint.message}`
    : game.status === "revealed"
      ? "Solution shown. Start a new puzzle when you are ready."
      : selNotes && game.selected !== null
        ? `Notes in ${cellName(game.selected, size)}: ${valuesOf(selNotes).map(symbolOf).join(" · ")}`
        : "";

  return (
    <main className="app mx-auto flex w-full max-w-[720px] flex-col">
      <header className="flex items-center justify-between gap-2 pb-2">
        <div className="min-w-0">
          <h1 className="text-lg font-extrabold leading-tight tracking-tight">Sudoku 16</h1>
          <button
            type="button"
            onClick={() => setSheet("new")}
            className="text-sm font-medium text-blue-600 dark:text-sky-400"
            aria-label={`${rule.fullLabel}. Start a new puzzle`}
          >
            {rule.fullLabel} ▾
          </button>
        </div>
        <div className="flex items-center gap-3 text-sm tabular-nums">
          <span className={game.mistakes ? "text-red-600 dark:text-red-400" : "text-slate-500"} aria-label={`${game.mistakes} mistakes`}>
            ✕ {game.mistakes}
          </span>
          <span className="min-w-[3.5rem] text-right font-semibold" aria-label="Time">
            {formatTime(game.elapsedMs)}
          </span>
          <button
            type="button"
            disabled={!playing}
            onClick={() => dispatch({ type: "setPaused", paused: !game.paused })}
            aria-label={game.paused ? "Resume" : "Pause"}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 disabled:opacity-30 dark:bg-slate-800"
          >
            {game.paused ? <PlayIcon width={18} height={18} /> : <PauseIcon width={18} height={18} />}
          </button>
          <button
            type="button"
            onClick={() => setSheet("menu")}
            aria-label="Menu"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800"
          >
            <MenuIcon width={20} height={20} />
          </button>
        </div>
      </header>

      <Board
        puzzle={game.puzzle}
        solution={game.solution}
        values={game.values}
        notes={game.notes}
        selected={game.selected}
        status={game.status}
        paused={game.paused}
        hintCell={game.lastHint?.cell ?? null}
        settings={settings}
        onSelect={onSelect}
        onResume={onResume}
      />

      <button
        type="button"
        onClick={() => dispatch({ type: "dismissHint" })}
        className="info-line my-1.5 line-clamp-2 min-h-[2.5rem] text-left text-xs leading-snug text-slate-600 dark:text-slate-300"
        aria-live="polite"
      >
        {infoLine}
      </button>

      <div className="flex flex-col gap-2 pb-1">
        <Toolbar
          canUndo={game.undo.length > 0}
          canRedo={game.redo.length > 0}
          notesMode={game.notesMode}
          disabled={!playing || game.paused}
          onUndo={onUndo}
          onRedo={onRedo}
          onErase={onErase}
          onToggleNotes={onToggleNotes}
          onHint={onHint}
        />
        <NumberPad size={size} values={game.values} notesMode={game.notesMode} disabled={!playing || game.paused} onInput={onInput} />
        {!playing && (
          <button type="button" onClick={() => setSheet("new")} className="rounded-xl bg-blue-600 py-3 font-semibold text-white">
            New puzzle
          </button>
        )}
      </div>

      {notice && (
        <div role="alert" className="fixed inset-x-4 top-4 z-40 mx-auto max-w-md rounded-xl bg-amber-100 p-3 text-sm text-amber-900 shadow-lg dark:bg-amber-900 dark:text-amber-50">
          {notice}
          <button type="button" onClick={dismissNotice} className="ml-2 font-semibold underline">
            OK
          </button>
        </div>
      )}

      {sheet === "menu" && (
        <MenuSheet
          canReveal={playing}
          onNew={() => setSheet("new")}
          onRestart={() => setSheet("restart")}
          onReveal={() => setSheet("reveal")}
          onStats={() => setSheet("stats")}
          onSettings={() => setSheet("settings")}
          onClose={close}
        />
      )}
      {sheet === "new" && <NewGameSheet current={game.difficulty} onPick={requestNewGame} onClose={close} />}
      {sheet === "stats" && <StatsSheet stats={stats} onClose={close} />}
      {sheet === "settings" && <SettingsSheet settings={settings} onChange={updateSettings} onClose={close} />}
      {sheet === "restart" && (
        <ConfirmSheet
          title="Restart puzzle?"
          body="This clears your entries, notes, timer and mistakes for this puzzle."
          confirmLabel="Restart"
          danger
          onConfirm={() => {
            dispatch({ type: "restart" });
            close();
          }}
          onClose={close}
        />
      )}
      {sheet === "reveal" && (
        <ConfirmSheet
          title="Show the solution?"
          body="The puzzle ends and your streak resets."
          confirmLabel="Show solution"
          danger
          onConfirm={() => {
            dispatch({ type: "reveal" });
            close();
          }}
          onClose={close}
        />
      )}
      {sheet === "abandon" && pendingDifficulty && (
        <ConfirmSheet
          title="Start a new puzzle?"
          body="Your current puzzle will be lost and your streak resets."
          confirmLabel={`New ${DIFFICULTY_RULES[pendingDifficulty].fullLabel} puzzle`}
          onConfirm={() => {
            close();
            void newGame(pendingDifficulty);
          }}
          onClose={close}
        />
      )}
      {game.status === "won" && dismissedWinFor !== game.id && !sheet && (
        <CompletionSheet
          game={game}
          bestMs={stats[game.difficulty].bestMs}
          onNew={(d) => {
            setDismissedWinFor(game.id);
            void newGame(d);
          }}
          onClose={() => setDismissedWinFor(game.id)}
        />
      )}
    </main>
  );
}
