/**
 * Builds lib/sudoku/bank.json: validated, graded puzzles for every difficulty.
 *
 *   npm run generate:bank            # 40 per 16x16 level, 4x that for 9x9 (default)
 *   npm run generate:bank -- 60      # 60 per 16x16 level, 240 for 9x9
 *
 * Every accepted puzzle: unique solution (proved by the solver),
 * and grade.maxTier inside the difficulty's tier range.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { DIFFICULTY_ORDER, DIFFICULTY_RULES, matchesDifficulty } from "../lib/sudoku/difficulty";
import { clueCount, digPuzzle, generateSolution } from "../lib/sudoku/generator";
import { geometryFor, serializeGrid } from "../lib/sudoku/grid";
import { grade } from "../lib/sudoku/logic";
import { countSolutions, makeRng } from "../lib/sudoku/solver";
import type { BankEntry, PuzzleBank } from "../lib/sudoku/bank";

const perLevel = Number(process.argv[2] ?? 40);
const seen = new Set<string>();
const bank: PuzzleBank = {
  version: 1,
  generatedAt: new Date().toISOString(),
  puzzles: { easy: [], medium: [], hard: [], extreme: [], "classic-extreme": [] },
};

let seed = 1;
for (const d of DIFFICULTY_ORDER) {
  const rule = DIFFICULTY_RULES[d];
  // 9x9 puzzles are tiny (~100 bytes) and fewer symmetries exist, so ship more of them.
  const target = rule.size === 9 ? perLevel * 4 : perLevel;
  let attempts = 0;
  const t0 = Date.now();
  while (bank.puzzles[d].length < target) {
    attempts++;
    const rng = makeRng(seed++ * 2654435761);
    const solution = generateSolution(rng, geometryFor(rule.size));
    const puzzle = digPuzzle(solution, rng, { maxTier: rule.digMaxTier, minClues: rule.digMinClues });
    const g = grade(puzzle);
    if (!matchesDifficulty(g, d)) continue;
    if (countSolutions(puzzle, 5_000_000) !== 1) continue;
    const key = serializeGrid(puzzle);
    if (seen.has(key)) continue;
    seen.add(key);
    const entry: BankEntry = {
      id: `${d === "classic-extreme" ? "X" : d[0].toUpperCase()}${String(bank.puzzles[d].length + 1).padStart(3, "0")}`,
      puzzle: key,
      clues: clueCount(puzzle),
      tier: g.maxTier,
      score: g.score,
    };
    bank.puzzles[d].push(entry);
    process.stdout.write(`\r${d}: ${bank.puzzles[d].length}/${target} (attempts ${attempts})`);
  }
  console.log(`  done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

const out = join(__dirname, "..", "lib", "sudoku", "bank.json");
writeFileSync(out, JSON.stringify(bank));
console.log(`Wrote ${out}`);
