import { cellName, geoOf, popcount, symbolOf, type Grid } from "./grid";
import { LogicState, TECHNIQUES, nextStep, type Technique } from "./logic";

export type Hint =
  | { kind: "mistake"; cell: number; message: string }
  | { kind: "place"; cell: number; value: number; techniques: Technique[]; message: string };

/**
 * Find the next move on the player's board.
 *
 * 1. If an entry is wrong, point at it first (a hint on a broken board is useless).
 * 2. Otherwise run the logic solver from the current board. Elimination steps
 *    are applied silently until a placement appears; every technique used is
 *    named in the message so the player can learn it.
 * 3. If logic gets stuck (Extreme puzzles), reveal the cell with the fewest
 *    candidates from the validated solution and say so honestly.
 */
export function findHint(values: Grid, solution: Grid): Hint | null {
  const { cells, size } = geoOf(values);
  for (let i = 0; i < cells; i++) {
    if (values[i] && values[i] !== solution[i]) {
      return { kind: "mistake", cell: i, message: `${cellName(i, size)} is wrong. Erase it and try again.` };
    }
  }
  const s = LogicState.fromGrid(values);
  if (!s || s.isSolved()) return null;

  const used: Technique[] = [];
  const notes: string[] = [];
  for (let guard = 0; guard < 500; guard++) {
    const step = nextStep(s);
    if (!step) break;
    used.push(step.technique);
    if (step.placements.length) {
      const { cell, value } = step.placements[0];
      // Logic is sound, but double-check against the solution before placing anything.
      if (solution[cell] !== value) break;
      const prefix = notes.length ? `First: ${notes.slice(0, 2).join(" Then: ")}${notes.length > 2 ? ` (+${notes.length - 2} more steps)` : ""} Now: ` : "";
      return {
        kind: "place",
        cell,
        value,
        techniques: used,
        message: `${TECHNIQUES[step.technique].name}. ${prefix}${step.description}`,
      };
    }
    notes.push(step.description);
    s.apply(step);
  }

  let best = -1;
  for (let i = 0; i < cells; i++) {
    if (!values[i] && (best < 0 || popcount(s.cands[i]) < popcount(s.cands[best]))) best = i;
  }
  if (best < 0) return null;
  return {
    kind: "place",
    cell: best,
    value: solution[best],
    techniques: used,
    message: `No step found with the built-in techniques (up to Swordfish). Revealed ${cellName(best, size)} = ${symbolOf(solution[best])} from the solution.`,
  };
}
