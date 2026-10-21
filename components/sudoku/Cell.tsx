'use client';

import { memo, type CSSProperties } from 'react';
import { SIZE } from '@/lib/sudoku/constants';
import { notesToDigits } from '@/lib/game/selectors';

export interface CellProps {
  index: number;
  value: number;
  given: boolean;
  notesMask: number;
  isSelected: boolean;
  isPeer: boolean;
  isSameValue: boolean;
  isWrong: boolean;
  isConflict: boolean;
  isHintReason: boolean;
  isHintTarget: boolean;
  onSelect: (index: number) => void;
}

const THIN = '1px solid var(--board-line)';
const THICK = '2px solid var(--board-thick)';

function borderStyle(index: number): CSSProperties {
  const row = Math.floor(index / SIZE);
  const col = index % SIZE;
  return {
    borderTop: row % 3 === 0 ? THICK : THIN,
    borderLeft: col % 3 === 0 ? THICK : THIN,
    borderRight: col === SIZE - 1 ? THICK : 'none',
    borderBottom: row === SIZE - 1 ? THICK : 'none',
  };
}

function backgroundFor(props: CellProps): string {
  // Hardcore mode: no row/column/box or matching-number assistance. Only the
  // selected cell, hint highlights, and rule conflicts are shown.
  if (props.isConflict || props.isWrong) return 'var(--cell-wrong-bg)';
  if (props.isSelected) return 'var(--cell-selected)';
  if (props.isHintReason || props.isHintTarget) return 'var(--cell-highlight-digit)';
  return 'transparent';
}

function textColorFor(props: CellProps): string {
  if (props.isWrong || props.isConflict) return 'var(--cell-wrong-text)';
  if (props.given) return 'var(--cell-given)';
  return 'var(--cell-user)';
}

function CellComponent(props: CellProps) {
  const { index, value, given, notesMask, onSelect } = props;
  const digits = value === 0 ? notesToDigits(notesMask) : [];

  return (
    <button
      type="button"
      aria-label={`Cell ${Math.floor(index / SIZE) + 1},${(index % SIZE) + 1}`}
      onClick={() => onSelect(index)}
      className="relative flex h-full w-full select-none items-center justify-center overflow-hidden"
      style={{
        minWidth: 0,
        minHeight: 0,
        ...borderStyle(index),
        background: backgroundFor(props),
        color: textColorFor(props),
        fontWeight: given ? 700 : 500,
        boxShadow: props.isHintTarget ? 'inset 0 0 0 2px var(--accent)' : undefined,
        transition: 'background-color 90ms ease',
      }}
    >
      {value !== 0 ? (
        <span style={{ fontSize: 'min(6vw, 1.7rem)', lineHeight: 1 }}>{value}</span>
      ) : (
        <div
          className="grid h-full w-full"
          style={{
            gridTemplateColumns: 'repeat(3, 1fr)',
            gridTemplateRows: 'repeat(3, 1fr)',
            padding: '2px',
          }}
        >
          {Array.from({ length: 9 }, (_, i) => i + 1).map((d) => (
            <span
              key={d}
              className="flex items-center justify-center"
              style={{
                fontSize: 'min(2.4vw, 0.62rem)',
                lineHeight: 1,
                color: 'var(--text-muted)',
                visibility: digits.includes(d) ? 'visible' : 'hidden',
              }}
            >
              {d}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

export const Cell = memo(CellComponent);
