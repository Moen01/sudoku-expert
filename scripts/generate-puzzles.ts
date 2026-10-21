/**
 * Build-time generator for the bundled Extreme puzzle dataset.
 *
 * Generates minimal-dig puzzles, keeps only those that are (a) fully solvable
 * by the logical solver — so in-app hints can always explain a move — and
 * (b) require at least one advanced technique (X-Wing / XY-Wing / Swordfish),
 * then ranks them by difficulty and writes the hardest to
 * `data/extreme-puzzles.json`.
 *
 * Usage: `npm run generate:puzzles -- [count] [poolMultiplier]`
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { digHoles, generateSolution } from '../lib/sudoku/generator';
import { gradePuzzle, bandAtLeast, TECHNIQUE_ORDER } from '../lib/sudoku/logicalSolver';
import { puzzleId } from '../lib/sudoku/generator';
import { clueCount, parseGrid, stringifyGrid } from '../lib/sudoku/grid';
import { hasUniqueSolution, solve } from '../lib/sudoku/solver';
import { isValidSolution } from '../lib/sudoku/validation';
import type { PuzzleRecord, Technique } from '../lib/sudoku/types';

const __dirname = dirname(fileURLToPath(import.meta.url));

const COUNT = Number(process.argv[2] ?? 300);
const POOL_MULTIPLIER = Number(process.argv[3] ?? 3);
const TARGET_POOL = COUNT * POOL_MULTIPLIER;

const techniqueWeightIndex = (t: Technique | null): number =>
  t === null ? -1 : TECHNIQUE_ORDER.indexOf(t);

function generateDataset(): PuzzleRecord[] {
  const pool = new Map<string, PuzzleRecord>();
  const start = Date.now();
  let attempts = 0;

  while (pool.size < TARGET_POOL) {
    attempts++;
    const solution = generateSolution();
    const puzzle = digHoles(solution);
    const report = gradePuzzle(puzzle);
    if (!report.solved || !bandAtLeast(report.band, 'extreme')) continue;

    const puzzleStr = stringifyGrid(puzzle);
    const id = puzzleId(puzzleStr);
    if (pool.has(id)) continue;

    // Final independent validation of every accepted puzzle.
    const grid = parseGrid(puzzleStr);
    if (!hasUniqueSolution(grid)) continue;
    const solved = solve(grid);
    if (!solved || !isValidSolution(solved) || stringifyGrid(solved) !== stringifyGrid(solution)) {
      continue;
    }

    pool.set(id, {
      id,
      puzzle: puzzleStr,
      solution: stringifyGrid(solution),
      difficulty: {
        band: report.band,
        score: report.score,
        hardestTechnique: report.hardestTechnique,
      },
      source: 'dataset',
    });

    if (pool.size % 25 === 0) {
      const secs = ((Date.now() - start) / 1000).toFixed(0);
      process.stdout.write(`  ${pool.size}/${TARGET_POOL} collected (${attempts} attempts, ${secs}s)\n`);
    }
  }

  // Rank hardest first: by hardest technique required, then cumulative score.
  const ranked = [...pool.values()].sort((a, b) => {
    const tw = techniqueWeightIndex(b.difficulty.hardestTechnique) -
      techniqueWeightIndex(a.difficulty.hardestTechnique);
    if (tw !== 0) return tw;
    return b.difficulty.score - a.difficulty.score;
  });

  return ranked.slice(0, COUNT);
}

function summarize(records: PuzzleRecord[]): void {
  const byTechnique: Record<string, number> = {};
  let minClues = 81;
  let maxClues = 0;
  let minScore = Infinity;
  let maxScore = 0;
  for (const r of records) {
    const t = r.difficulty.hardestTechnique ?? 'none';
    byTechnique[t] = (byTechnique[t] ?? 0) + 1;
    const clues = clueCount(parseGrid(r.puzzle));
    minClues = Math.min(minClues, clues);
    maxClues = Math.max(maxClues, clues);
    minScore = Math.min(minScore, r.difficulty.score);
    maxScore = Math.max(maxScore, r.difficulty.score);
  }
  console.log(`\nDataset of ${records.length} extreme puzzles`);
  console.log('Hardest technique distribution:', byTechnique);
  console.log(`Clues: ${minClues}–${maxClues}, score: ${minScore}–${maxScore}`);
}

function write(records: PuzzleRecord[]): void {
  // Shuffle so the app does not serve puzzles in strict hardest-first order.
  for (let i = records.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [records[i], records[j]] = [records[j], records[i]];
  }
  const outPath = join(__dirname, '..', 'data', 'extreme-puzzles.json');
  const body = records.map((r) => '  ' + JSON.stringify(r)).join(',\n');
  writeFileSync(outPath, `[\n${body}\n]\n`, 'utf8');
  console.log(`\nWrote ${records.length} puzzles to ${outPath}`);
}

console.log(`Generating ${COUNT} extreme puzzles (pool target ${TARGET_POOL})...`);
const dataset = generateDataset();
summarize(dataset);
write(dataset);
