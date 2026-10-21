import { describe, expect, it } from 'vitest';
import {
  countSolutions,
  findConflicts,
  findNextStep,
  generatePuzzle,
  generateSolution,
  gradePuzzle,
  hasUniqueSolution,
  isLegalConfiguration,
  isValidSolution,
  parseGrid,
  solutionMatchesPuzzle,
  solve,
  solveLogically,
  stringifyGrid,
} from './index';

// The canonical Wikipedia example puzzle and its unique solution.
const PUZZLE = '53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79';
const SOLUTION = '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

describe('validation', () => {
  it('accepts a valid complete solution', () => {
    expect(isValidSolution(parseGrid(SOLUTION))).toBe(true);
  });

  it('rejects a grid with a duplicate in a row', () => {
    const bad = parseGrid(SOLUTION);
    bad[1] = bad[0]; // force a duplicate in row 1
    expect(isValidSolution(bad)).toBe(false);
  });

  it('treats a partial legal puzzle as a legal configuration', () => {
    expect(isLegalConfiguration(parseGrid(PUZZLE))).toBe(true);
  });

  it('flags an illegal starting configuration', () => {
    const bad = parseGrid(PUZZLE);
    bad[1] = 5; // 5 already present at index 0 in the same row/box
    expect(isLegalConfiguration(bad)).toBe(false);
  });

  it('detects conflicting cells', () => {
    const grid = parseGrid(PUZZLE);
    grid[1] = 5;
    const conflicts = findConflicts(grid);
    expect(conflicts.has(0)).toBe(true);
    expect(conflicts.has(1)).toBe(true);
  });
});

describe('solver', () => {
  it('solves the canonical puzzle to its known solution', () => {
    const solved = solve(parseGrid(PUZZLE));
    expect(solved).not.toBeNull();
    expect(stringifyGrid(solved!)).toBe(SOLUTION);
  });

  it('reports a unique solution for a well-formed puzzle', () => {
    expect(hasUniqueSolution(parseGrid(PUZZLE))).toBe(true);
    expect(countSolutions(parseGrid(PUZZLE), 2)).toBe(1);
  });

  it('reports multiple solutions for an under-constrained grid', () => {
    const sparse = parseGrid('.'.repeat(81));
    expect(countSolutions(sparse, 2)).toBe(2);
  });

  it('validates that the solution matches the puzzle clues', () => {
    expect(solutionMatchesPuzzle(parseGrid(PUZZLE), parseGrid(SOLUTION))).toBe(true);
  });
});

describe('logical solver', () => {
  it('solves the canonical puzzle logically', () => {
    const result = solveLogically(parseGrid(PUZZLE));
    expect(result.solved).toBe(true);
    expect(stringifyGrid(result.grid)).toBe(SOLUTION);
  });

  it('produces a consistent next-step hint', () => {
    const step = findNextStep(parseGrid(PUZZLE));
    expect(step).not.toBeNull();
    if (step?.placement) {
      // The hinted placement must agree with the true solution.
      const solution = parseGrid(SOLUTION);
      expect(solution[step.placement.cell]).toBe(step.placement.digit);
    }
  });

  it('grades the canonical puzzle as a real band', () => {
    const report = gradePuzzle(parseGrid(PUZZLE));
    expect(['easy', 'medium', 'hard', 'expert', 'extreme']).toContain(report.band);
  });
});

describe('generator', () => {
  it('generates a valid complete solution', () => {
    const solution = generateSolution();
    expect(isValidSolution(solution)).toBe(true);
  });

  it('generates a unique, logically solvable extreme puzzle', () => {
    const record = generatePuzzle({ minBand: 'extreme', maxAttempts: 200 });
    expect(record).not.toBeNull();
    if (!record) return;
    const puzzle = parseGrid(record.puzzle);
    const solution = parseGrid(record.solution);
    // Unique solution and the stored solution is correct.
    expect(hasUniqueSolution(puzzle)).toBe(true);
    expect(solutionMatchesPuzzle(puzzle, solution)).toBe(true);
    // Extreme band and fully solvable by our logic (so hints always work).
    expect(record.difficulty.band).toBe('extreme');
    expect(solveLogically(puzzle).solved).toBe(true);
  }, 60_000);
});
