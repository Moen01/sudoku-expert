import { emptyDifficultyStats, emptyStats } from "@/lib/game/stats";
import { MAX_HISTORY } from "@/lib/game/reducer";
import { DEFAULT_SETTINGS, type CellChange, type DifficultyStats, type GameState, type Move, type Settings, type Stats } from "@/lib/game/types";
import { DIFFICULTY_ORDER, DIFFICULTY_RULES, isDifficulty, type Difficulty } from "@/lib/sudoku/difficulty";
import { isGridShape, puzzleMatchesSolution } from "@/lib/sudoku/validate";

/**
 * Versioned localStorage persistence. Saved progress lives here, separate
 * from the service-worker cache (which only holds app files), so an app
 * update never wipes a game in progress.
 */

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const KEYS = {
  game: "sudoku16:game",
  stats: "sudoku16:stats",
  settings: "sudoku16:settings",
  recent: "sudoku16:recent",
} as const;

export const SAVE_VERSION = 1;

interface Envelope<T> {
  v: number;
  savedAt: number;
  data: T;
}

/** localStorage can throw (private mode, disabled storage, quota). Never let that crash the game. */
export function browserStore(): KeyValueStore | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

function readRaw(store: KeyValueStore | null, key: string): unknown {
  if (!store) return undefined;
  try {
    const text = store.getItem(key);
    return text === null ? undefined : (JSON.parse(text) as unknown);
  } catch {
    return null; // present but unreadable
  }
}

function write<T>(store: KeyValueStore | null, key: string, data: T): boolean {
  if (!store) return false;
  try {
    const env: Envelope<T> = { v: SAVE_VERSION, savedAt: Date.now(), data };
    store.setItem(key, JSON.stringify(env));
    return true;
  } catch {
    return false;
  }
}

/**
 * Upgrade older envelopes to the current shape. Only v1 exists today;
 * add `if (env.v === 1) env = migrateV1toV2(env)` steps here when the format changes.
 */
function unwrap(raw: unknown): unknown {
  if (!isObject(raw) || typeof raw.v !== "number" || raw.v > SAVE_VERSION || raw.v < 1) return null;
  return raw.data;
}

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const isInt = (x: unknown, min: number, max: number): x is number => Number.isInteger(x) && (x as number) >= min && (x as number) <= max;
const isNum = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x) && x >= 0;

function isChange(x: unknown, cells: number, size: number): x is CellChange {
  return (
    isObject(x) &&
    isInt(x.i, 0, cells - 1) &&
    isInt(x.v0, 0, size) &&
    isInt(x.v1, 0, size) &&
    isInt(x.n0, 0, 0xffff) &&
    isInt(x.n1, 0, 0xffff)
  );
}

const isHistory = (x: unknown, cells: number, size: number): x is Move[] =>
  Array.isArray(x) &&
  x.length <= MAX_HISTORY &&
  x.every((m) => Array.isArray(m) && m.length > 0 && m.every((c) => isChange(c, cells, size)));

/** Full structural check. Returns the game or a reason it was rejected. */
export function validateGame(x: unknown): { ok: true; game: GameState } | { ok: false; reason: string } {
  if (!isObject(x)) return { ok: false, reason: "not an object" };
  const g = x as Partial<GameState>;
  if (typeof g.id !== "string" || !isDifficulty(g.difficulty)) return { ok: false, reason: "bad id or difficulty" };
  if (!isGridShape(g.puzzle) || !isGridShape(g.solution) || !isGridShape(g.values)) return { ok: false, reason: "bad grid" };
  const size = DIFFICULTY_RULES[g.difficulty].size;
  const cells = size * size;
  if (g.puzzle.length !== cells || g.values.length !== cells) return { ok: false, reason: "grid size does not match difficulty" };
  if (!puzzleMatchesSolution(g.puzzle, g.solution)) return { ok: false, reason: "puzzle does not match solution" };
  if (g.puzzle.some((v, i) => v !== 0 && g.values![i] !== v)) return { ok: false, reason: "givens were changed" };
  if (!Array.isArray(g.notes) || g.notes.length !== cells || !g.notes.every((n) => isInt(n, 0, 0xffff))) {
    return { ok: false, reason: "bad notes" };
  }
  if (!(g.selected === null || isInt(g.selected, 0, cells - 1))) return { ok: false, reason: "bad selection" };
  if (!isNum(g.elapsedMs) || !isInt(g.mistakes, 0, 1e6) || !isInt(g.hintsUsed, 0, 1e6)) return { ok: false, reason: "bad counters" };
  if (!isHistory(g.undo, cells, size) || !isHistory(g.redo, cells, size)) return { ok: false, reason: "bad history" };
  if (g.status !== "playing" && g.status !== "won" && g.status !== "revealed") return { ok: false, reason: "bad status" };
  if (!isObject(g.meta) || typeof g.meta.bankId !== "string") return { ok: false, reason: "bad meta" };
  return {
    ok: true,
    game: {
      ...(g as GameState),
      notesMode: g.notesMode === true,
      paused: false, // reopening the app continues right away
      createdAt: isNum(g.createdAt) ? g.createdAt : Date.now(),
      completedAt: isNum(g.completedAt) ? g.completedAt : null,
      lastHint: null,
    },
  };
}

export type LoadGameResult =
  | { kind: "none" }
  | { kind: "restored"; game: GameState; savedAt: number }
  | { kind: "finished"; difficulty: Difficulty }
  | { kind: "corrupt"; reason: string };

export function loadGame(store: KeyValueStore | null = browserStore()): LoadGameResult {
  const raw = readRaw(store, KEYS.game);
  if (raw === undefined) return { kind: "none" };
  const data = unwrap(raw);
  if (data === null) return { kind: "corrupt", reason: "unreadable or unknown save version" };
  const result = validateGame(data);
  if (!result.ok) return { kind: "corrupt", reason: result.reason };
  // A finished game is never restored as if it were still in progress.
  if (result.game.status !== "playing") return { kind: "finished", difficulty: result.game.difficulty };
  return { kind: "restored", game: result.game, savedAt: (raw as Envelope<unknown>).savedAt };
}

export const saveGame = (game: GameState, store: KeyValueStore | null = browserStore()): boolean =>
  write(store, KEYS.game, game);

export function clearGame(store: KeyValueStore | null = browserStore()): void {
  try {
    store?.removeItem(KEYS.game);
  } catch {
    // ignore: nothing else to do
  }
}

export function loadSettings(store: KeyValueStore | null = browserStore()): Settings {
  const data = unwrap(readRaw(store, KEYS.settings));
  if (!isObject(data)) return { ...DEFAULT_SETTINGS };
  const out = { ...DEFAULT_SETTINGS };
  for (const k of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    if (typeof data[k] === "boolean") out[k] = data[k] as boolean;
  }
  return out;
}

export const saveSettings = (s: Settings, store: KeyValueStore | null = browserStore()): boolean =>
  write(store, KEYS.settings, s);

function cleanDifficultyStats(x: unknown): DifficultyStats {
  const base = emptyDifficultyStats();
  if (!isObject(x)) return base;
  return {
    started: isInt(x.started, 0, 1e9) ? x.started : 0,
    completed: isInt(x.completed, 0, 1e9) ? x.completed : 0,
    bestMs: isNum(x.bestMs) ? x.bestMs : null,
    totalMs: isNum(x.totalMs) ? x.totalMs : 0,
    currentStreak: isInt(x.currentStreak, 0, 1e9) ? x.currentStreak : 0,
    longestStreak: isInt(x.longestStreak, 0, 1e9) ? x.longestStreak : 0,
    recent: Array.isArray(x.recent)
      ? x.recent.filter(
          (r): r is DifficultyStats["recent"][number] =>
            isObject(r) && isNum(r.ms) && isNum(r.at) && typeof r.id === "string" && isNum(r.mistakes),
        )
      : [],
  };
}

/** Stats are repaired field by field, so one bad value does not erase the rest. */
export function loadStats(store: KeyValueStore | null = browserStore()): Stats {
  const data = unwrap(readRaw(store, KEYS.stats));
  const stats = emptyStats();
  if (!isObject(data)) return stats;
  for (const d of DIFFICULTY_ORDER) stats[d] = cleanDifficultyStats(data[d]);
  return stats;
}

export const saveStats = (s: Stats, store: KeyValueStore | null = browserStore()): boolean => write(store, KEYS.stats, s);

const MAX_RECENT_IDS = 30;

export function loadRecentIds(store: KeyValueStore | null = browserStore()): string[] {
  const data = unwrap(readRaw(store, KEYS.recent));
  return Array.isArray(data) ? data.filter((x): x is string => typeof x === "string") : [];
}

export function rememberBankId(id: string, store: KeyValueStore | null = browserStore()): void {
  const list = [id, ...loadRecentIds(store).filter((x) => x !== id)].slice(0, MAX_RECENT_IDS);
  write(store, KEYS.recent, list);
}
