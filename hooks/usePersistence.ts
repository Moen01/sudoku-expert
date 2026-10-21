import { useEffect, useRef } from 'react';
import { saveGame } from '@/lib/storage/savedGame';
import type { GameState } from '@/lib/game/state';

/**
 * Autosaves the game. Writes are debounced so rapid input doesn't thrash
 * storage, and the latest state is flushed when the tab is hidden or unloaded.
 * We do not rely on unload events alone, because mobile browsers often kill
 * pages without firing them — the debounced writer is the real safety net.
 */
export function usePersistence(state: GameState | null, debounceMs = 400): void {
  const latest = useRef<GameState | null>(state);
  latest.current = state;

  // Debounced write on every state change.
  useEffect(() => {
    if (!state) return;
    const id = window.setTimeout(() => saveGame(state), debounceMs);
    return () => window.clearTimeout(id);
  }, [state, debounceMs]);

  // Flush immediately when the page is backgrounded or unloaded.
  useEffect(() => {
    const flush = (): void => {
      if (latest.current) saveGame(latest.current);
    };
    const onVisibility = (): void => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
    };
  }, []);
}
