import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { rootReducer, type GameState } from '@/lib/game/state';
import { getHint, type Hint } from '@/lib/game/hints';
import { clearSavedGame, loadGame } from '@/lib/storage/savedGame';
import {
  defaultStats,
  loadStats,
  recordCompletion,
  recordReveal,
  type Stats,
} from '@/lib/storage/stats';
import { useTimer } from './useTimer';
import { usePersistence } from './usePersistence';
import { usePuzzleProvider } from './usePuzzleProvider';

export interface SudokuGameApi {
  state: GameState | null;
  ready: boolean;
  stats: Stats;
  notice: string | null;
  hint: Hint | null;
  showCompletion: boolean;
  select: (cell: number | null) => void;
  moveSelection: (dRow: number, dCol: number) => void;
  enterValue: (value: number) => void;
  toggleNote: (value: number) => void;
  erase: () => void;
  undo: () => void;
  redo: () => void;
  newGame: () => void;
  restart: () => void;
  reveal: () => void;
  requestHint: () => void;
  clearHint: () => void;
  dismissCompletion: () => void;
  dismissNotice: () => void;
}

const HINT_TIMEOUT_MS = 7000;

export function useSudokuGame(): SudokuGameApi {
  const [state, dispatch] = useReducer(rootReducer, null);
  const [ready, setReady] = useState(false);
  const [stats, setStats] = useState<Stats>(defaultStats);
  const [notice, setNotice] = useState<string | null>(null);
  const [hint, setHint] = useState<Hint | null>(null);
  const [showCompletion, setShowCompletion] = useState(false);

  const { takePuzzle } = usePuzzleProvider();
  const statsRef = useRef(stats);
  statsRef.current = stats;
  const settledRef = useRef<number | null>(null);
  const initRef = useRef(false);
  const hintTimer = useRef<number | undefined>(undefined);

  // One-time initialization: restore an unfinished game or start a new one.
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    setStats(loadStats());
    const result = loadGame();
    if (result.status === 'ok' && result.state.status === 'playing') {
      dispatch({ type: 'LOAD', state: result.state });
    } else {
      if (result.status === 'corrupt') {
        setNotice('Your saved game could not be read and was reset. A fresh puzzle is ready.');
      }
      dispatch({ type: 'NEW_GAME', puzzle: takePuzzle(), now: Date.now() });
    }
    setReady(true);
  }, [takePuzzle]);

  // Autosave + timer.
  usePersistence(state);
  const onTick = useCallback((deltaMs: number) => dispatch({ type: 'TICK', deltaMs }), []);
  useTimer(state?.status === 'playing', onTick);

  // Record terminal states (completion / reveal) exactly once per game.
  useEffect(() => {
    if (!state) return;
    const key = state.createdAt;
    if (state.status === 'completed' && settledRef.current !== key) {
      settledRef.current = key;
      setStats(recordCompletion(statsRef.current, state.elapsedMs));
      setShowCompletion(true);
    } else if (state.status === 'revealed' && settledRef.current !== key) {
      settledRef.current = key;
      setStats(recordReveal(statsRef.current));
    }
  }, [state]);

  const clearHint = useCallback(() => {
    if (hintTimer.current) window.clearTimeout(hintTimer.current);
    setHint(null);
  }, []);

  const select = useCallback((cell: number | null) => dispatch({ type: 'SELECT', cell }), []);
  const moveSelection = useCallback(
    (dRow: number, dCol: number) => dispatch({ type: 'MOVE_SELECTION', dRow, dCol }),
    [],
  );
  const enterValue = useCallback(
    (value: number) => {
      clearHint();
      dispatch({ type: 'ENTER_VALUE', value });
    },
    [clearHint],
  );
  const toggleNote = useCallback(
    (value: number) => {
      clearHint();
      dispatch({ type: 'TOGGLE_NOTE', value });
    },
    [clearHint],
  );
  const erase = useCallback(() => {
    clearHint();
    dispatch({ type: 'ERASE' });
  }, [clearHint]);
  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), []);

  const newGame = useCallback(() => {
    clearHint();
    setShowCompletion(false);
    clearSavedGame();
    dispatch({ type: 'NEW_GAME', puzzle: takePuzzle(), now: Date.now() });
  }, [clearHint, takePuzzle]);

  const restart = useCallback(() => {
    clearHint();
    setShowCompletion(false);
    dispatch({ type: 'RESTART', now: Date.now() });
  }, [clearHint]);

  const reveal = useCallback(() => {
    clearHint();
    dispatch({ type: 'REVEAL_SOLUTION' });
  }, [clearHint]);

  const requestHint = useCallback(() => {
    if (!state || state.status !== 'playing') return;
    const result = getHint(state);
    setHint(result);
    if (result.kind === 'mistake') {
      dispatch({ type: 'SELECT', cell: result.cell });
    } else if (result.value !== undefined) {
      dispatch({ type: 'APPLY_HINT', cell: result.cell, value: result.value });
    }
    if (hintTimer.current) window.clearTimeout(hintTimer.current);
    hintTimer.current = window.setTimeout(() => setHint(null), HINT_TIMEOUT_MS);
  }, [state]);

  const dismissCompletion = useCallback(() => setShowCompletion(false), []);
  const dismissNotice = useCallback(() => setNotice(null), []);

  return {
    state,
    ready,
    stats,
    notice,
    hint,
    showCompletion,
    select,
    moveSelection,
    enterValue,
    toggleNote,
    erase,
    undo,
    redo,
    newGame,
    restart,
    reveal,
    requestHint,
    clearHint,
    dismissCompletion,
    dismissNotice,
  };
}
