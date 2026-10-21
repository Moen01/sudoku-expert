# Sudoku Expert

A polished, offline-capable **Extreme Sudoku** web app built with Next.js and tuned for iPhone. It
ships only genuinely hard puzzles (each requires an XY‑Wing or Swordfish to crack), saves your
progress automatically, works offline as a PWA, and can be installed to the iOS home screen.

> Live gameplay is 100% client-side. There is no backend, no account, and no external API.

## Features

- **Extreme puzzles only.** Every puzzle is verified to have a unique solution and to require
  advanced logical techniques (X‑Wing / XY‑Wing / Swordfish). See
  [Difficulty & correctness](#difficulty--correctness).
- **Full solving UI** — tap/keyboard cell selection, number pad, pencil marks (notes), undo/redo,
  erase, and explained hints.
- **Smart hints** that reveal the next *logically forced* move and name the technique behind it,
  always consistent with the validated solution. They also flag an incorrect entry first.
- **Mistake handling** that distinguishes rule conflicts from entries that merely differ from the
  solution, with a running mistake counter.
- **Automatic save / restore.** Close Safari and reopen later to continue exactly where you left
  off — board, pencil marks, timer, mistakes, and full undo/redo history all persist.
- **Offline PWA.** Installable via *Add to Home Screen*; plays with no network once cached.
- **Local statistics** — completions, best time, average, streaks — stored on-device only.
- **iPhone-first design** — responsive, touch-friendly, no horizontal scroll, safe-area aware,
  light & dark themes.

## Tech stack

- [Next.js](https://nextjs.org) (App Router) with `output: 'export'` → a fully static site
- TypeScript (strict) + React 19
- Tailwind CSS
- `localStorage` for persistence (small, versioned, validated)
- A custom Sudoku engine (solver, logical grader, generator) — no Sudoku dependencies
- A Web Worker for background puzzle generation
- Vitest for tests; deployed to Netlify

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
```

Useful scripts:

| Script | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build → static export in `out/` |
| `npm run start` | Serve the exported `out/` locally (`npx serve`) |
| `npm run test` | Run the Vitest suite |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (next) |
| `npm run generate:puzzles -- [count] [poolMultiplier]` | Regenerate the bundled dataset |
| `npm run generate:icons` | Regenerate the PWA icons |

## Project structure

```
app/                     Next.js routes, layout, global styles
components/sudoku/        Board, cell, number pad, toolbar, modals, game shell
lib/sudoku/              Pure engine: grid, validation, solver, logical grader, generator
lib/game/                Game state reducer, selectors, hints, puzzle source
lib/storage/             Versioned persistence: saved game, stats, puzzle queue
hooks/                   React hooks: game orchestration, timer, persistence, puzzle provider
workers/                 Background puzzle-generation Web Worker
data/                    Bundled, pre-validated Extreme puzzle dataset (JSON)
scripts/                 Build-time dataset & icon generators
public/                  Manifest, service worker, offline page, icons
```

## Difficulty & correctness

Puzzles are **generated and graded offline** by `scripts/generate-puzzles.ts` and bundled in
`data/extreme-puzzles.json` (currently 260 puzzles, 22–27 clues). Generation:

1. Build a random complete solution via randomized backtracking.
2. Dig clues while re-checking uniqueness after each removal (minimal-dig).
3. Grade the puzzle with a **human-style logical solver** that applies, in order: naked/hidden
   singles, pointing & box‑line reductions, naked/hidden pairs & triples, X‑Wing, XY‑Wing and
   Swordfish.
4. Accept a puzzle **only if** it is fully solvable by that logic *and* its hardest required
   technique is X‑Wing or harder. Each accepted puzzle is independently re-validated (unique
   solution, correct stored solution).

Classifying by the single hardest required technique follows the spirit of Sudoku‑Explainer‑style
ratings. Requiring full logical solvability means in-app hints can always explain a real move. This
app does **not** claim to reproduce sudoku.club's exact algorithm — the difficulty model is our own,
documented here.

At runtime a **Web Worker** generates additional puzzles in the background to keep a small queue
topped up, so you rarely repeat a puzzle. The bundled dataset is always the instant, offline
fallback — the app never needs the network or the worker to give you a valid Extreme puzzle.

## Persistence

All data lives in `localStorage` under a versioned namespace (`sudoku-expert:v1:*`). Saved game data
is **separate from the service-worker asset cache** — clearing one never corrupts the other. Reads
are validated; corrupt or outdated data is discarded gracefully (the app recovers with a fresh
puzzle and a notice rather than crashing).

## Deploy to Netlify

This is a static site, so no Next.js runtime plugin is needed.

### Option A — GitHub integration (recommended)

1. Push this repo to GitHub.
2. In Netlify: **Add new site → Import an existing project → GitHub**, pick the repo.
3. Netlify reads `netlify.toml`, so the settings are prefilled:
   - **Build command:** `npm run build`
   - **Publish directory:** `out`
4. Click **Deploy**. Netlify builds and gives you a public `https://<name>.netlify.app` URL.

No environment variables or secrets are required.

### Option B — Netlify CLI

```bash
npm i -g netlify-cli
netlify login
npm run build
netlify deploy --prod --dir=out
```

### After deploying

Open the URL on your iPhone in Safari, then **Share → Add to Home Screen** to install it as a
full-screen app. It will keep working offline.

## Testing

```bash
npm run test
```

Covers the solver and generator (validity, uniqueness, extreme grading), the game reducer
(entry rules, pencil marks, undo/redo, completion), persistence (round-trip, corruption recovery,
stats), hints, and a jsdom integration test that mounts the real game UI.

## License

Personal project. Puzzle content is generated by this repository's own engine.
