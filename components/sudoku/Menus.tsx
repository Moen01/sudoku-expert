"use client";

import { formatTime } from "@/lib/game/format";
import type { GameState, Settings, Stats } from "@/lib/game/types";
import { DIFFICULTY_ORDER, DIFFICULTY_RULES, type Difficulty } from "@/lib/sudoku/difficulty";
import { Sheet, SheetButton } from "./Sheet";

export function NewGameSheet({ current, onPick, onClose }: { current: Difficulty; onPick: (d: Difficulty) => void; onClose: () => void }) {
  return (
    <Sheet title="New puzzle" onClose={onClose}>
      {([16, 9] as const).map((size) => (
        <section key={size} className="mb-4 last:mb-0">
          <h3 className="mb-2 text-sm font-semibold text-slate-500">
            {size === 16 ? "16×16 · symbols 1–9, A–G" : "Classic 9×9 · digits 1–9"}
          </h3>
          <div className="flex flex-col gap-2">
            {DIFFICULTY_ORDER.filter((d) => DIFFICULTY_RULES[d].size === size).map((d) => (
              <SheetButton key={d} onClick={() => onPick(d)} tone={d === current ? "primary" : "default"}>
                <span className="block">{DIFFICULTY_RULES[d].label}</span>
                <span className="block text-xs font-normal opacity-80">{DIFFICULTY_RULES[d].summary}</span>
              </SheetButton>
            ))}
          </div>
        </section>
      ))}
    </Sheet>
  );
}

export function MenuSheet(p: {
  canReveal: boolean;
  onNew: () => void;
  onRestart: () => void;
  onReveal: () => void;
  onStats: () => void;
  onSettings: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet title="Menu" onClose={p.onClose}>
      <div className="flex flex-col gap-2">
        <SheetButton onClick={p.onNew} tone="primary">New puzzle</SheetButton>
        <SheetButton onClick={p.onRestart}>Restart this puzzle</SheetButton>
        {p.canReveal && <SheetButton onClick={p.onReveal}>Show solution</SheetButton>}
        <SheetButton onClick={p.onStats}>Statistics</SheetButton>
        <SheetButton onClick={p.onSettings}>Settings &amp; help</SheetButton>
      </div>
    </Sheet>
  );
}

export function ConfirmSheet(p: {
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet title={p.title} onClose={p.onClose}>
      <p className="mb-4 text-slate-600 dark:text-slate-300">{p.body}</p>
      <div className="flex flex-col gap-2">
        <SheetButton onClick={p.onConfirm} tone={p.danger ? "danger" : "primary"}>{p.confirmLabel}</SheetButton>
        <SheetButton onClick={p.onClose}>Cancel</SheetButton>
      </div>
    </Sheet>
  );
}

export function StatsSheet({ stats, onClose }: { stats: Stats; onClose: () => void }) {
  return (
    <Sheet title="Statistics" onClose={onClose}>
      <div className="flex flex-col gap-4">
        {DIFFICULTY_ORDER.map((d) => {
          const s = stats[d];
          return (
            <section key={d}>
              <h3 className="mb-1 font-semibold">{DIFFICULTY_RULES[d].fullLabel}</h3>
              <dl className="grid grid-cols-3 gap-2 text-center text-sm">
                <Stat label="Solved" value={`${s.completed}/${s.started}`} />
                <Stat label="Best" value={s.bestMs === null ? "–" : formatTime(s.bestMs)} />
                <Stat label="Average" value={s.completed ? formatTime(s.recent.reduce((a, r) => a + r.ms, 0) / Math.max(1, s.recent.length)) : "–"} />
                <Stat label="Streak" value={String(s.currentStreak)} />
                <Stat label="Longest" value={String(s.longestStreak)} />
                <Stat label="Played" value={formatTime(s.totalMs)} />
              </dl>
              {s.recent.length > 0 && (
                <p className="mt-1 text-xs text-slate-500">
                  Recent: {s.recent.slice(0, 5).map((r) => formatTime(r.ms)).join(" · ")}
                </p>
              )}
            </section>
          );
        })}
        <p className="text-xs text-slate-500">Stats stay on this device. Hints keep your streak; showing the solution or leaving a started puzzle resets it.</p>
      </div>
    </Sheet>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-100 px-2 py-1.5 dark:bg-slate-800">
      <dt className="text-[11px] text-slate-500">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

const SETTING_LABELS: { key: keyof Settings; label: string; help: string }[] = [
  { key: "checkMistakes", label: "Check against solution", help: "Count and mark entries that are not in the solution." },
  { key: "showConflicts", label: "Show conflicts", help: "Mark symbols that repeat in a row, column or box." },
  { key: "highlightPeers", label: "Highlight row, column, box", help: "Shade the cells related to the selected cell." },
  { key: "highlightMatching", label: "Highlight same symbol", help: "Shade every cell with the selected symbol." },
  { key: "autoRemoveNotes", label: "Auto-remove notes", help: "Placing a symbol removes it from notes in its row, column and box." },
];

export function SettingsSheet({ settings, onChange, onClose }: { settings: Settings; onChange: (p: Partial<Settings>) => void; onClose: () => void }) {
  return (
    <Sheet title="Settings & help" onClose={onClose}>
      <div className="flex flex-col divide-y divide-slate-200 dark:divide-slate-700">
        {SETTING_LABELS.map(({ key, label, help }) => (
          <label key={key} className="flex cursor-pointer items-center justify-between gap-4 py-3">
            <span>
              <span className="block font-medium">{label}</span>
              <span className="block text-xs text-slate-500">{help}</span>
            </span>
            <input
              type="checkbox"
              className="h-6 w-6 shrink-0 accent-blue-600"
              checked={settings[key]}
              onChange={(e) => onChange({ [key]: e.target.checked })}
            />
          </label>
        ))}
      </div>
      <h3 className="mb-1 mt-5 font-semibold">How to play</h3>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Fill every row, column and box with each symbol exactly once: 1–9 and A–G in 4×4 boxes on 16×16, or 1–9 in 3×3 boxes on classic 9×9. Tap a cell, then a symbol. Tap the same symbol again to clear it.
      </p>
      <h3 className="mb-1 mt-4 font-semibold">Keyboard</h3>
      <ul className="text-sm text-slate-600 dark:text-slate-300">
        <li>1–9, A–G (16×16 only): enter symbol · Arrows: move</li>
        <li>Backspace / Delete / 0: erase · N: notes mode</li>
        <li>Ctrl/⌘+Z: undo · Ctrl/⌘+Shift+Z or Ctrl+Y: redo · Esc: deselect</li>
      </ul>
    </Sheet>
  );
}

export function CompletionSheet(p: { game: GameState; bestMs: number | null; onNew: (d: Difficulty) => void; onClose: () => void }) {
  const isBest = p.bestMs !== null && p.game.elapsedMs <= p.bestMs;
  return (
    <Sheet title="Solved! 🎉" onClose={p.onClose}>
      <div className="mb-4 grid grid-cols-3 gap-2 text-center">
        <Stat label="Time" value={formatTime(p.game.elapsedMs)} />
        <Stat label="Mistakes" value={String(p.game.mistakes)} />
        <Stat label="Hints" value={String(p.game.hintsUsed)} />
      </div>
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
        {DIFFICULTY_RULES[p.game.difficulty].fullLabel} puzzle complete.
        {isBest ? " New best time!" : p.bestMs !== null ? ` Best: ${formatTime(p.bestMs)}.` : ""}
      </p>
      <div className="flex flex-col gap-2">
        <SheetButton tone="primary" onClick={() => p.onNew(p.game.difficulty)}>
          Next {DIFFICULTY_RULES[p.game.difficulty].fullLabel} puzzle
        </SheetButton>
        <div className="grid grid-cols-2 gap-2">
          {DIFFICULTY_ORDER.filter((d) => d !== p.game.difficulty).map((d) => (
            <button key={d} type="button" onClick={() => p.onNew(d)} className="rounded-xl bg-slate-100 py-3 text-sm font-semibold dark:bg-slate-800">
              {DIFFICULTY_RULES[d].fullLabel}
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}
