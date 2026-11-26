# Sudoku 16

A Sudoku game for the web, made for iPhone first. Two board sizes:

- **16×16:** symbols `1 2 3 4 5 6 7 8 9 A B C D E F G`, 4×4 boxes. Levels: **Easy, Medium, Hard, Extreme**.
- **Classic 9×9:** digits `1`–`9`, 3×3 boxes. **Extreme only.**
- Difficulty is **measured** by a logic solver, not guessed.
- **Offline:** after the first visit, the game works with no network.
- **Saves itself:** close Safari, come back tomorrow, continue where you stopped.
- **No backend, no account, no database, no API keys.** The app is a static site.

---

## Contents

1. [Features](#features)
2. [How to play](#how-to-play)
3. [Difficulty classification](#difficulty-classification)
4. [Quick start (local)](#quick-start-local)
5. [Scripts](#scripts)
6. [Deploy to Netlify](#deploy-to-netlify)
7. [Install on iPhone](#install-on-iphone)
8. [Saving and offline: how it works](#saving-and-offline-how-it-works)
9. [Project structure](#project-structure)
10. [Tests](#tests)
11. [Known limitations](#known-limitations)
12. [Troubleshooting](#troubleshooting)

---

## Features

| Area | What you get |
| --- | --- |
| Board | 16×16 or 9×9 grid, thick lines around each box, givens in bold, your entries in blue |
| Highlights | Selected cell, its row/column/box, all cells with the same symbol, conflicts in red |
| Input | Number pad with "left" count per symbol (16×16: 2 rows × 8, 9×9: 1 row × 9), physical keyboard |
| Notes | Notes mode toggle, pencil marks per cell (4×4 grid on 16×16, 3×3 on 9×9), selected cell's notes also shown in large text under the board |
| History | Undo / redo for entries, erases, notes, hints (up to 1000 moves, saved with the game) |
| Hints | Next logical move with the technique name and a short explanation |
| Mistakes | Mistake counter, wrong-entry marking, conflict marking (each can be turned off) |
| Game | Timer, pause (hides the board), restart, show solution, new puzzle per level and size |
| Stats | Per level and size (16×16 Easy … 9×9 Extreme): solved/started, best, average, current and longest streak, time played, recent times |
| PWA | Manifest, icons, service worker, "Add to Home Screen" on iPhone |
| Theme | Light and dark (follows the phone setting) |

## How to play

Fill every row, every column and every box with each symbol exactly once: the 16 symbols in 4×4 boxes on 16×16, or 1–9 in 3×3 boxes on 9×9.

Change size or level by tapping the level name under the title (for example **16×16 Extreme ▾**), or open **Menu → New puzzle**.

1. Tap a cell.
2. Tap a symbol on the pad. Tap the same symbol again to clear it.
3. Tap **Notes** to switch to pencil marks. A tapped symbol is then added as a note, and tapping it again removes the note.
4. When you place a symbol, it is removed from the notes in the same row, column and box (setting: *Auto-remove notes*).

**Keyboard** (iPad / Mac / external keyboard):

| Key | Action |
| --- | --- |
| `1`–`9`, `A`–`G` | Enter symbol (or note in notes mode). `A`–`G` do nothing on 9×9. |
| Arrow keys | Move selection (wraps around) |
| `Backspace`, `Delete`, `0` | Erase |
| `N` | Toggle notes mode |
| `Ctrl/⌘ + Z` | Undo |
| `Ctrl/⌘ + Shift + Z`, `Ctrl + Y` | Redo |
| `Esc` | Deselect / close dialog |

**Mistakes – two different things:**

- **Conflict** (red background): the symbol is already in the same row, column or box. This breaks a rule you can see.
- **Wrong** (red text, counted in ✕): the symbol breaks no visible rule but is not in the solution. Only shown when *Check against solution* is on (default on). Turn it off in **Menu → Settings** if you want no help.

**Streaks:** a win adds 1. Showing the solution, or leaving a started puzzle for a new one, resets the streak to 0. Hints do **not** reset the streak.

## Difficulty classification

Every puzzle is solved by a **human-style logic solver** (`lib/sudoku/logic.ts`). The solver always uses the easiest technique that makes progress. The puzzle's level is the **hardest technique tier** it needed.

| Tier | Techniques |
| --- | --- |
| 1 | Hidden single, naked single |
| 2 | Pointing pair/triple, box/line reduction, naked pair, hidden pair |
| 3 | Naked/hidden triple, naked/hidden quad |
| 4 | X-Wing, Swordfish |
| 5 | None of the above is enough (needs chains, forcing or trial and error) |

| Level | Rule (see `lib/sudoku/difficulty.ts`) | Givens |
| --- | --- | --- |
| **16×16 Easy** | Tier 1 only, digging stops at 136 givens | 136 / 256 |
| **16×16 Medium** | Needs tier 2, nothing harder, digging stops at 112 givens | 112 / 256 |
| **16×16 Hard** | Needs tier 3 or 4 | 96–110 / 256 |
| **16×16 Extreme** | Tier 5: the solver gets stuck, but the solution is still proved unique | 96–106 / 256 |
| **9×9 Extreme** | Tier 4 or 5: needs X-Wing/Swordfish, or something harder (XY-Wing, chains) | 24–31 / 81 |

**Why 9×9 Extreme starts at tier 4 and 16×16 Extreme at tier 5:** we measured 1500 minimal 9×9 puzzles. 68% need only singles (tier 1), 9% need tier 2, about 0.3% need tier 3–4, and 22% go beyond the solver (tier 5). On 9×9, puzzles that need X-Wing or Swordfish are already rare and hard, so they count as Extreme. The generator rejects about 3 of every 4 dug 9×9 puzzles. On 16×16, almost every hard puzzle gets to tier 5 anyway, so tier 3–4 is "Hard" there.

Each puzzle also gets a **score** (sum of technique weights) that is stored in the bank for reference.

**Every puzzle is checked:**

1. The backtracking solver (`lib/sudoku/solver.ts`) proves there is **exactly one solution**.
2. The logic solver confirms that the tier matches the level.
3. Before you see a board, the app solves it again in the browser and checks the givens against the solution. If anything fails, it uses another puzzle. An invalid board is never shown.

> This is our own classification. It is **not** the same algorithm as any other Sudoku site, and the levels are not promised to match them.

### Where puzzles come from

Generating and grading a 16×16 puzzle takes 0.1–1.5 s (a 9×9 puzzle takes ~2 ms, but most are not Extreme). So puzzles are made **at build time**, not on your phone:

- `npm run generate:bank` writes `lib/sudoku/bank.json`: 40 validated puzzles per 16×16 level and 160 for 9×9 Extreme (320 in total, ~73 KB). 9×9 gets more because each puzzle is tiny and a 9×9 grid has fewer symmetries.
- At runtime, each new game takes a bank puzzle (the app avoids the last 30 you played) and applies a **random symmetry**: relabel the symbols, shuffle bands and stacks, shuffle rows inside a band and columns inside a stack, maybe transpose. These changes keep the rules, the unique solution and the difficulty. They give more than 10²⁰ different-looking boards per 16×16 bank puzzle and about 1.2 trillion per 9×9 bank puzzle. So you will practically never see the same board twice.
- Because the bank ships with the app, a new puzzle is **instant and works offline**. No Web Worker is needed, because the browser does no heavy generation.

Want more variety? Run `npm run generate:bank -- 100` (100 per 16×16 level, 400 for 9×9) and commit the new `bank.json`.

## Quick start (local)

Requirements: **Node.js 20 or newer** (22 recommended) and npm.

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:3000. The service worker is **off** in dev mode, so you always see fresh code.

To test the real production build (with the service worker and offline mode):

```bash
npm run build
```

```bash
npm start
```

Then open http://localhost:4173.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Static production build into `out/` |
| `npm start` | Serve `out/` on port 4173 (uses Python 3, which macOS has) |
| `npm run typecheck` | TypeScript strict check |
| `npm run lint` | ESLint (Next.js rules) |
| `npm test` | Vitest unit tests |
| `npm run check` | typecheck + lint + test + build (run this before you push) |
| `npm run generate:bank [-- N]` | Regenerate the puzzle bank (N per 16×16 level, 4×N for 9×9; default 40) |
| `npm run generate:icons` | Regenerate the PNG icons in `public/icons/` |

## Deploy to Netlify

The app is a **static export** (`output: "export"` in `next.config.ts`). Netlify only serves files from `out/`. There are no functions, no environment variables and no secrets.

All settings are already in `netlify.toml`:

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Publish directory | `out` |
| Node version | 22 |
| Environment variables | none |

### Option A – GitHub + Netlify (recommended: automatic deploy on every push)

1. Create an empty repository on GitHub (no README, no .gitignore).
2. Push this project:

   ```bash
   git init
   ```

   ```bash
   git add .
   ```

   ```bash
   git commit -m "Sudoku 16"
   ```

   ```bash
   git branch -M main
   ```

   ```bash
   git remote add origin https://github.com/<you>/<repo>.git
   ```

   ```bash
   git push -u origin main
   ```

3. Go to https://app.netlify.com → **Add new site** → **Import an existing project** → **GitHub** → pick the repository.
4. Netlify reads `netlify.toml`, so the build settings are already filled in. Click **Deploy**.
5. After about 1 minute you get a URL such as `https://random-name-123.netlify.app`. Rename it in **Site configuration → Change site name**, for example `my-sudoku16.netlify.app`.

Each push to `main` now deploys a new version.

### Option B – Netlify CLI (no GitHub)

```bash
npx netlify-cli login
```

```bash
npm run build
```

```bash
npx netlify-cli deploy --prod --dir=out
```

The first time, the CLI asks you to create or link a site.

### Option C – drag and drop

Run `npm run build`, open https://app.netlify.com/drop, and drag the `out` folder onto the page.

### After deploy: check it

1. Open the URL on your iPhone in Safari. A Medium puzzle loads.
2. Enter a few symbols, close Safari, open it again: the game continues.
3. Turn on Airplane Mode and reload: the game still works.

## Install on iPhone

1. Open the site in **Safari**.
2. Tap **Share** → **Add to Home Screen** → **Add**.
3. Start it from the home screen icon. It opens full screen, without the Safari bars.

> The home-screen app and the Safari tab have **separate storage** on iOS. A game started in Safari does not show in the home-screen app, and the reverse. Pick one and stay with it.

## Saving and offline: how it works

There are **two separate stores**. This is on purpose: an app update never deletes your game.

| What | Where | Key / name |
| --- | --- | --- |
| Current game (board, notes, undo/redo, timer, mistakes, hints, selection) | `localStorage` | `sudoku16:game` |
| Statistics | `localStorage` | `sudoku16:stats` |
| Settings | `localStorage` | `sudoku16:settings` |
| Recently played bank ids (to avoid repeats) | `localStorage` | `sudoku16:recent` |
| App files (HTML, JS, CSS, icons, puzzle bank) | Service worker cache | `sudoku16-v1` |

**When the game saves:**

- 250 ms after every move (entry, erase, note, undo, redo, hint, restart, selection).
- Every 5 s while only the timer changes.
- Immediately when the page is hidden (`visibilitychange`) or closed (`pagehide`). iOS can stop a background tab without an `unload` event, so the app does **not** depend on `unload`.

**Timer:** it counts only while the page is visible and the game is not paused. Time with the app closed or in the background is not counted. One timer tick adds at most 5 s, so a late wake-up cannot add hours.

**Restoring:** on open, the saved game is validated (shape, ranges, givens unchanged, puzzle matches solution, history is valid). Then:

- Valid and in progress → restored, timer continues.
- Finished (solved or solution shown) → **not** restored; a new puzzle of the same level starts.
- Broken or from an unknown version → a new puzzle starts, and a message tells you why. Stats are kept. Stats are repaired field by field, so one bad value does not erase the rest.

**Versioning:** every saved value is wrapped as `{ v, savedAt, data }`. When the format changes, add a migration step in `unwrap()` in `lib/storage/storage.ts` and increase `SAVE_VERSION`.

**Service worker** (`public/sw.js`):

- Page (HTML): **network first**, cache as fallback. Online, you always get the newest version. Offline, you get the cached one.
- `/_next/static/*`: **cache first**. These file names contain a content hash, so a cached file is never stale.
- Icons and manifest: stale-while-revalidate.
- After the first load, the page sends the worker the list of files it already loaded (including the puzzle bank chunk), so offline play works from the second visit.
- `netlify.toml` sets `Cache-Control: no-cache` on `/sw.js`, so phones pick up a new worker quickly.
- To force-clear the app cache, change `CACHE` in `public/sw.js` (for example `sudoku16-v2`). Saved games are not affected.

## Project structure

```
app/
  layout.tsx            Metadata, viewport (no zoom, safe areas), manifest, SW registration
  page.tsx              Renders <Game />
  globals.css           Tailwind, iOS touch fixes, board sizing (container query units)
components/
  ServiceWorker.tsx     Registers /sw.js in production, hands it the loaded URLs
  sudoku/
    Game.tsx            Main screen: header, board, toolbar, pad, dialogs, keyboard
    Board.tsx, Cell.tsx Grid rendering; cells are memoised so a tap re-renders few cells
    NumberPad.tsx       16 symbol keys with remaining counts
    Toolbar.tsx         Undo, redo, erase, notes, hint
    Menus.tsx           New game, menu, stats, settings/help, confirm, completion
    Sheet.tsx, icons.tsx
hooks/
  useGame.ts            Load/restore, autosave, timer, stats, new game
lib/
  sudoku/               Pure logic, no React
    grid.ts             Geometry for 9x9 and 16x16 (picked from grid length), symbols, bitmask helpers
    solver.ts           Constraint propagation + backtracking, uniqueness check, seeded RNG
    logic.ts            Human techniques, step finder, grader
    difficulty.ts       Level rules (each level has a board size)
    generator.ts        Full-grid generator + clue digger (build time)
    transform.ts        Symmetry transforms
    bank.ts / bank.json Validated puzzle bank and runtime preparation
    hint.ts             Hint engine
    validate.ts         Conflicts, solved-grid check, puzzle/solution check
  game/
    types.ts            GameState, Move, Settings, Stats
    reducer.ts          All game actions as one pure reducer
    stats.ts            Pure stats updates
    format.ts           Time formatting
  storage/
    storage.ts          Versioned localStorage, validation, migrations hook
scripts/
  generate-bank.ts      Builds lib/sudoku/bank.json
  generate-icons.ts     Builds public/icons/*.png with no image library
tests/                  Vitest
public/                 manifest, sw.js, icons
netlify.toml            Build + headers
```

**Design notes for the next developer:**

- **One engine for both sizes.** `geoOf(grid)` returns the 9×9 or 16×16 geometry from the grid length (81 or 256). The solver, logic solver, hints, reducer and storage use it, so most functions take a plain grid and need no size argument.
- **Board size is part of the level.** `classic-extreme` is just another `Difficulty` with `size: 9`. Stats, the bank, saving and the menus all work per level, so a new size/level is mostly one entry in `DIFFICULTY_RULES`.
- Candidates are 16-bit masks (bit `v-1` means "v is possible"). A 64 KB popcount table makes counting O(1).
- Game logic is a **pure reducer** (`(state, action) => newState`). A move stores each touched cell's value and notes *before and after*, so undo/redo is exact and can be saved as JSON.
- The board gets separate props, not the whole game object, so the 1-second timer does not re-render 256 cells.
- Everything that can throw (`localStorage`, bank preparation) is wrapped and falls back safely.

## Tests

```bash
npm test
```

54 tests in `tests/`:

| File | Covers |
| --- | --- |
| `sudoku.test.ts` | Geometry for both sizes, symbols, parsing (A–G rejected on 9×9), conflicts, solver (0/1/many solutions), transforms keep uniqueness |
| `bank.test.ts` | **Every** bank puzzle (all 320) has the right size, exactly one solution and is graded at its level; no duplicates; transforms keep the grade; recent puzzles are avoided |
| `reducer.test.ts` | Givens cannot change, entry/toggle/erase, mistake counting, conflict vs wrong, notes, auto-remove notes, undo/redo exactness, hints stay correct, hints can solve an Extreme puzzle to the end (16×16 and 9×9), win detection, timer rules, reveal/restart, arrow wrap; on 9×9: A–G rejected, 9-column wrap, peer notes |
| `storage.test.ts` | Full save/restore (board, notes, undo, redo, timer) for both sizes, finished games not restored, corrupt JSON / unknown version / changed givens / wrong grid size rejected, throwing `localStorage`, settings merge, stats and streaks, old stats get empty 9×9 stats |

**Checked by hand** in a 375×812 (iPhone-size) browser viewport, light and dark: layout fits with no horizontal scroll, cell select, entry, notes, hints, reload restores the game, offline reload after the server was stopped, a new Extreme puzzle starts offline. 9×9: board, 9-key pad, 3×3 notes, `A` key ignored, hint, reload restore. A 16×16 game saved by the earlier version still loads.

## Known limitations

- **Not yet tested on a real iPhone.** It was checked in an emulated iPhone viewport only. Please test on your phone after deploy.
- **16×16 notes are small.** On a 375 px wide phone each cell is about 22 px, so 16 notes per cell are tiny. To help, the selected cell's notes are also shown in normal text under the board. 9×9 notes are a normal size.
- **Extreme is very hard.** 16×16 Extreme and most 9×9 Extreme puzzles need more than the built-in techniques (up to Swordfish). When the hint engine also gets stuck, it reveals one cell from the solution and says so clearly.
- **The app name stays "Sudoku 16"** for both sizes. Change `metadata` in `app/layout.tsx`, `public/manifest.webmanifest` and the `<h1>` in `components/sudoku/Game.tsx` if you want another name.
- **Hints place the symbol** (and say why). They do not only highlight.
- **Storage is per device and per browser.** There is no cloud sync. Clearing Safari website data deletes saved games and stats.
- **Timer keeps running while a dialog is open.** Use the pause button if you need a break.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Old version after deploy | Close the app/tab fully and open it again (the HTML is network-first). On iPhone home-screen apps, swipe the app away first. |
| "Your saved game could not be read" | Saved data was broken or from an unknown version. A new game started; stats are kept. |
| Offline does not work | Open the site once online, wait a few seconds, then reload once. The service worker only runs on HTTPS (Netlify) or `localhost`. |
| Netlify build fails on Node | `netlify.toml` sets Node 22. Do not override `NODE_VERSION` in the Netlify UI with an older version. |
| Want to reset everything | Safari → Settings → Advanced → Website Data → remove the site. Or in a desktop browser console: `localStorage.clear()`. |
