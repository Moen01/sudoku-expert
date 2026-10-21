'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSudokuGame } from '@/hooks/useSudokuGame';
import { getRemainingCounts } from '@/lib/game/selectors';
import { Board } from './Board';
import { Header } from './Header';
import { Toolbar } from './Toolbar';
import { NumberPad } from './NumberPad';
import { ActionBar } from './ActionBar';
import { HintBanner } from './HintBanner';
import { CompletionModal } from './CompletionModal';
import { StatsModal } from './StatsModal';
import { ConfirmModal } from './ConfirmModal';

type ConfirmAction = 'new' | 'restart' | 'reveal';

const CONFIRM_COPY: Record<ConfirmAction, { title: string; message: string; label: string }> = {
  new: {
    title: 'New puzzle',
    message: 'Start a new Extreme puzzle? Your current progress will be discarded.',
    label: 'New puzzle',
  },
  restart: {
    title: 'Restart puzzle',
    message: 'Restart this puzzle? All of your entries and pencil marks will be cleared.',
    label: 'Restart',
  },
  reveal: {
    title: 'Reveal solution',
    message: "Reveal the full solution? This ends the puzzle and won't count toward your streak.",
    label: 'Reveal',
  },
};

export function SudokuGame() {
  const game = useSudokuGame();
  const [notesMode, setNotesMode] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);

  const { state, ready } = game;
  const isPlaying = state?.status === 'playing';

  const remaining = useMemo(() => (state ? getRemainingCounts(state) : new Array(10).fill(9)), [state]);
  const hintReason = useMemo(() => new Set(game.hint?.reasonCells ?? []), [game.hint]);
  const hintTarget = game.hint ? game.hint.cell : null;

  const { enterValue, toggleNote, erase, undo, redo, moveSelection, requestHint } = game;

  // Physical-keyboard support (does not interfere with touch input).
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key >= '1' && e.key <= '9') {
        if (notesMode) toggleNote(Number(e.key));
        else enterValue(Number(e.key));
      } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        erase();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveSelection(-1, 0);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        moveSelection(1, 0);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        moveSelection(0, -1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        moveSelection(0, 1);
      } else if (e.key === 'n' || e.key === 'N') {
        setNotesMode((v) => !v);
      } else if (e.key === 'z' || e.key === 'Z') {
        undo();
      } else if (e.key === 'y' || e.key === 'Y') {
        redo();
      } else if (e.key === 'h' || e.key === 'H') {
        requestHint();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [notesMode, enterValue, toggleNote, erase, moveSelection, undo, redo, requestHint]);

  const runConfirm = useCallback(() => {
    if (confirm === 'new') game.newGame();
    else if (confirm === 'restart') game.restart();
    else if (confirm === 'reveal') game.reveal();
    setConfirm(null);
  }, [confirm, game]);

  if (!ready || !state) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center">
        <div className="animate-pulse text-sm" style={{ color: 'var(--text-muted)' }}>
          Loading your puzzle…
        </div>
      </main>
    );
  }

  return (
    <main className="safe-area flex min-h-[100dvh] w-full justify-center overflow-x-hidden">
      <div className="flex w-full max-w-[480px] flex-col gap-3 px-3 py-3">
        <Header
          elapsedMs={state.elapsedMs}
          mistakes={state.mistakes}
          hintsUsed={state.hintsUsed}
          onStats={() => setStatsOpen(true)}
        />

        {game.notice && (
          <div
            className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm"
            style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}
          >
            <span>{game.notice}</span>
            <button type="button" onClick={game.dismissNotice} className="font-semibold underline">
              Dismiss
            </button>
          </div>
        )}

        <Board
          state={state}
          hintReason={hintReason}
          hintTarget={hintTarget}
          onSelect={game.select}
        />

        <HintBanner hint={game.hint} />

        <Toolbar
          canUndo={state.history.length > 0}
          canRedo={state.future.length > 0}
          notesMode={notesMode}
          disabled={!isPlaying}
          onUndo={undo}
          onRedo={redo}
          onErase={erase}
          onToggleNotes={() => setNotesMode((v) => !v)}
          onHint={requestHint}
        />

        <NumberPad
          remaining={remaining}
          notesMode={notesMode}
          disabled={!isPlaying}
          onDigit={(d) => (notesMode ? toggleNote(d) : enterValue(d))}
        />

        <ActionBar
          onNew={() => setConfirm('new')}
          onRestart={() => setConfirm('restart')}
          onReveal={() => setConfirm('reveal')}
        />
      </div>

      <CompletionModal
        open={game.showCompletion}
        elapsedMs={state.elapsedMs}
        mistakes={state.mistakes}
        hintsUsed={state.hintsUsed}
        stats={game.stats}
        onNewGame={game.newGame}
        onClose={game.dismissCompletion}
      />

      <StatsModal open={statsOpen} stats={game.stats} onClose={() => setStatsOpen(false)} />

      <ConfirmModal
        open={confirm !== null}
        title={confirm ? CONFIRM_COPY[confirm].title : ''}
        message={confirm ? CONFIRM_COPY[confirm].message : ''}
        confirmLabel={confirm ? CONFIRM_COPY[confirm].label : ''}
        onConfirm={runConfirm}
        onCancel={() => setConfirm(null)}
      />
    </main>
  );
}
