"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { gameReducer, newGameState, type GameAction } from "@/lib/game/reducer";
import { recordLoss, recordStart, recordWin } from "@/lib/game/stats";
import type { GameState, Settings, Stats } from "@/lib/game/types";
import { loadBank, pickEntry, preparePuzzle, type PreparedPuzzle } from "@/lib/sudoku/bank";
import type { Difficulty } from "@/lib/sudoku/difficulty";
import {
  loadGame,
  loadRecentIds,
  loadSettings,
  loadStats,
  rememberBankId,
  saveGame,
  saveSettings,
  saveStats,
} from "@/lib/storage/storage";

type RootAction = GameAction | { type: "load"; game: GameState };

function rootReducer(s: GameState | null, a: RootAction): GameState | null {
  if (a.type === "load") return a.game;
  return s ? gameReducer(s, a) : s;
}

const TIME_ONLY_SAVE_MS = 5_000;
const SAVE_DEBOUNCE_MS = 250;

/** True when two states differ only in elapsed time (so the save can wait). */
function onlyTimeChanged(a: GameState, b: GameState): boolean {
  for (const k of Object.keys(b) as (keyof GameState)[]) {
    if (k !== "elapsedMs" && a[k] !== b[k]) return false;
  }
  return true;
}

function randomSeed(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0];
}

async function preparePuzzleFor(difficulty: Difficulty): Promise<PreparedPuzzle> {
  const bank = await loadBank();
  const entries = bank.puzzles[difficulty];
  const recent = loadRecentIds();
  // A bad entry throws in preparePuzzle; try others rather than show an invalid board.
  for (let attempt = 0; attempt < 5; attempt++) {
    const entry = pickEntry(entries, recent, Math.random);
    try {
      return preparePuzzle(entry, difficulty, randomSeed());
    } catch (err) {
      console.error(err);
    }
  }
  throw new Error("Could not prepare a valid puzzle");
}

export interface UseGame {
  game: GameState | null;
  settings: Settings;
  stats: Stats;
  notice: string | null;
  loading: boolean;
  dispatch: (a: GameAction) => void;
  newGame: (d: Difficulty) => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => void;
  dismissNotice: () => void;
}

export function useGame(): UseGame {
  const [game, dispatchRoot] = useReducer(rootReducer, null);
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [stats, setStats] = useState<Stats>(() => loadStats());
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const gameRef = useRef<GameState | null>(null);
  gameRef.current = game;

  const updateStats = useCallback((fn: (s: Stats) => Stats) => {
    setStats((prev) => {
      const next = fn(prev);
      saveStats(next);
      return next;
    });
  }, []);

  const newGame = useCallback(
    async (difficulty: Difficulty) => {
      setLoading(true);
      try {
        const cur = gameRef.current;
        // Leaving a started game counts as a loss for the streak.
        if (cur && cur.status === "playing" && cur.undo.length > 0) {
          updateStats((s) => recordLoss(s, cur.difficulty, cur.elapsedMs));
        }
        const p = await preparePuzzleFor(difficulty);
        rememberBankId(p.bankId);
        updateStats((s) => recordStart(s, difficulty));
        const g = newGameState(p, Date.now());
        saveGame(g);
        dispatchRoot({ type: "load", game: g });
      } catch (err) {
        console.error(err);
        setNotice("Could not load a new puzzle. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [updateStats],
  );

  // ---- restore on first open ----
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const r = loadGame();
    if (r.kind === "restored") {
      dispatchRoot({ type: "load", game: r.game });
      setLoading(false);
      return;
    }
    if (r.kind === "corrupt") {
      setNotice("Your saved game could not be read, so a new puzzle was started. Statistics are kept.");
    }
    void newGame(r.kind === "finished" ? r.difficulty : "medium");
  }, [newGame]);

  // ---- autosave: debounced on every move, throttled for timer-only changes ----
  const lastSaved = useRef<{ game: GameState; at: number } | null>(null);
  useEffect(() => {
    if (!game) return;
    const prev = lastSaved.current;
    if (prev && prev.game === game) return;
    if (prev && onlyTimeChanged(prev.game, game) && Date.now() - prev.at < TIME_ONLY_SAVE_MS) return;
    const t = window.setTimeout(() => {
      saveGame(game);
      lastSaved.current = { game, at: Date.now() };
    }, SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [game]);

  // Mobile Safari may kill a background tab without "unload", so save the moment the page is hidden.
  useEffect(() => {
    const flush = () => {
      const g = gameRef.current;
      if (g) {
        saveGame(g);
        lastSaved.current = { game: g, at: Date.now() };
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
    };
  }, []);

  // ---- timer: counts only while the page is visible ----
  const running = !!game && game.status === "playing" && !game.paused;
  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      if (document.visibilityState === "visible") dispatchRoot({ type: "tick", ms: now - last });
      last = now;
    }, 1000);
    const onVisibility = () => {
      last = performance.now(); // never count time spent in the background
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [running]);

  // ---- stats on win / reveal (once per game) ----
  const recordedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!game || game.status === "playing" || recordedFor.current === game.id) return;
    recordedFor.current = game.id;
    if (game.status === "won") {
      updateStats((s) => recordWin(s, game.difficulty, game.elapsedMs, game.id, game.mistakes, Date.now()));
    } else {
      updateStats((s) => recordLoss(s, game.difficulty, game.elapsedMs));
    }
  }, [game, updateStats]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  return {
    game,
    settings,
    stats,
    notice,
    loading,
    dispatch: dispatchRoot,
    newGame,
    updateSettings,
    dismissNotice: useCallback(() => setNotice(null), []),
  };
}
