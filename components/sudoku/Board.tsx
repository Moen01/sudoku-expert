'use client';

import { useMemo } from 'react';
import { CELL_COUNT } from '@/lib/sudoku/constants';
import { getConflicts, getHighlight, getWrongCells } from '@/lib/game/selectors';
import type { GameState } from '@/lib/game/state';
import { Cell } from './Cell';

interface BoardProps {
  state: GameState;
  hintReason: Set<number>;
  hintTarget: number | null;
  onSelect: (index: number) => void;
}

export function Board({ state, hintReason, hintTarget, onSelect }: BoardProps) {
  const { highlight, conflicts, wrong } = useMemo(
    () => ({
      highlight: getHighlight(state),
      conflicts: getConflicts(state),
      wrong: getWrongCells(state),
    }),
    [state],
  );

  const selectedValue = highlight.selectedValue;

  return (
    <div
      className="mx-auto w-full"
      style={{ maxWidth: 'min(92vw, 460px)' }}
      role="grid"
      aria-label="Sudoku board"
    >
      <div
        className="grid aspect-square w-full overflow-hidden rounded-md"
        style={{
          gridTemplateColumns: 'repeat(9, 1fr)',
          background: 'var(--board-bg)',
        }}
      >
        {Array.from({ length: CELL_COUNT }, (_, index) => {
          const value = state.values[index];
          return (
            <Cell
              key={index}
              index={index}
              value={value}
              given={state.givens[index] !== 0}
              notesMask={state.notes[index]}
              isSelected={state.selected === index}
              isPeer={highlight.peers.has(index)}
              isSameValue={selectedValue !== 0 && value === selectedValue}
              isWrong={wrong.has(index)}
              isConflict={conflicts.has(index)}
              isHintReason={hintReason.has(index)}
              isHintTarget={hintTarget === index}
              onSelect={onSelect}
            />
          );
        })}
      </div>
    </div>
  );
}
