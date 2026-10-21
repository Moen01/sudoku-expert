// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SudokuGame } from './SudokuGame';

afterEach(cleanup);

const remainingOf = (label: string): number => {
  const btn = screen.getByLabelText(label);
  return Number((btn.textContent ?? '').trim().slice(-1));
};

describe('SudokuGame (integration)', () => {
  it('mounts and renders the board, number pad and controls', async () => {
    render(<SudokuGame />);
    await screen.findByRole('grid', { name: /sudoku board/i });

    expect(screen.getByText('Expert')).toBeDefined();
    expect(screen.getByText('Extreme')).toBeDefined();
    const cells = screen.getAllByRole('button', { name: /^Cell \d,\d$/ });
    expect(cells).toHaveLength(81);
    for (let d = 1; d <= 9; d++) {
      expect(screen.getByLabelText(`Enter ${d}`)).toBeDefined();
    }
  });

  it('places a digit from the number pad into the auto-selected cell', async () => {
    render(<SudokuGame />);
    await screen.findByRole('grid', { name: /sudoku board/i });

    const before = remainingOf('Enter 5');
    fireEvent.click(screen.getByLabelText('Enter 5'));
    const after = remainingOf('Enter 5');
    expect(after).toBe(before - 1);
  });

  it('toggles notes mode and switches the pad to pencil input', async () => {
    render(<SudokuGame />);
    await screen.findByRole('grid', { name: /sudoku board/i });

    fireEvent.click(screen.getByRole('button', { name: /notes/i, pressed: false }));
    expect(screen.getByRole('button', { name: /notes/i, pressed: true })).toBeDefined();
    // In notes mode the pad relabels to "Pencil mark".
    expect(screen.getByLabelText('Pencil mark 7')).toBeDefined();
  });

  it('opens the statistics dialog', async () => {
    render(<SudokuGame />);
    await screen.findByRole('grid', { name: /sudoku board/i });

    fireEvent.click(screen.getByLabelText('Statistics'));
    await screen.findByRole('dialog', { name: /statistics/i });
    expect(screen.getByText('Completed')).toBeDefined();
  });

  it('asks for confirmation before revealing the solution', async () => {
    render(<SudokuGame />);
    await screen.findByRole('grid', { name: /sudoku board/i });

    fireEvent.click(screen.getByRole('button', { name: /solution/i }));
    await screen.findByRole('dialog', { name: /reveal solution/i });
  });
});
