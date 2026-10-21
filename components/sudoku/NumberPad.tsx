'use client';

interface NumberPadProps {
  remaining: number[];
  notesMode: boolean;
  disabled: boolean;
  onDigit: (digit: number) => void;
}

export function NumberPad({ remaining, notesMode, disabled, onDigit }: NumberPadProps) {
  return (
    <div className="flex w-full gap-1" role="group" aria-label="Number pad">
      {Array.from({ length: 9 }, (_, i) => i + 1).map((digit) => {
        const exhausted = remaining[digit] <= 0;
        const isDisabled = disabled || exhausted;
        return (
          <button
            key={digit}
            type="button"
            disabled={isDisabled}
            onClick={() => onDigit(digit)}
            aria-label={`${notesMode ? 'Pencil mark' : 'Enter'} ${digit}`}
            className="flex flex-1 flex-col items-center justify-center rounded-xl py-2 font-semibold transition active:scale-95 disabled:opacity-30"
            style={{
              minHeight: 52,
              background: 'var(--surface)',
              color: notesMode ? 'var(--text-muted)' : 'var(--accent)',
              border: notesMode ? '1.5px solid var(--accent)' : '1px solid var(--board-line)',
              fontSize: 'min(6vw, 1.5rem)',
            }}
          >
            <span>{digit}</span>
            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              {Math.max(0, remaining[digit])}
            </span>
          </button>
        );
      })}
    </div>
  );
}
