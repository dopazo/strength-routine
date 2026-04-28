# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Goal

Strength-training routine app for **flat open resistance bands** (therapy bands) — long flat strips, no handles. The user has no access to free weights, so every exercise must be designed to load major muscle groups using only one or more flat bands. Spanish-language UI; user-facing copy stays in Spanish.

## Stack & commands

Vite 6 + React 19 + Tailwind CSS v4 (`@tailwindcss/vite` plugin) + Three.js. Bun is the runtime/package manager.

- `bun install` — install deps
- `bun run dev` — Vite dev server (http://localhost:5173)
- `bun run build` — emit `dist/`
- `bun run preview` — serve the built bundle

## Hosting

Deployed to **GitHub Pages** at `dopazo.github.io/strength-routine/` via `.github/workflows/deploy.yml` — auto-deploys on push to `main` (`bun install` → `bun run build` → publishes `dist/`). `vite.config.js` sets `base: '/strength-routine/'` to match the repo subpath.

For Cloudflare Pages or root-domain hosting, remove the `base` line.

## Architecture

Three layers stacked from data → engine → UI. Adding a new exercise touches all three but is mostly data work.

### Data (`src/data/`)
- `poses.js` — each pose is a flat dict of joint angles (`shoulderL`, `elbowR`, `kneeL`, …) plus `rootPos`/`rootRot`/`torsoRot`. Angles in radians via the `d()` helper from `utils.js`. Pose key set is the contract with the skeleton.
- `exercises.js` — each exercise references pose ids via `keyframes` (typically `[A, B, A]` for a rep cycle), declares a `duration` (seconds for one full cycle in the 3D viewer), and a `band` config.
- `routine.js` — ordered list of `{exerciseId, sets, workSec, restSec, reps, phase}`. `TOTAL_DURATION` is computed at module load and used for the progress bar.

### State machine (`src/state/workoutReducer.js`)
`useReducer`-driven. Phases cycle `work → rest → work …` until the last set, then `transition → work` of the next exercise. Last `work` of the last exercise sets `isComplete`. `App.jsx` runs a 100ms `setInterval` dispatching `TICK` with `delta: 0.1`. Action types: `START`, `TICK`, `TOGGLE_PAUSE`, `NEXT` (skip remaining time of current phase), `PREV` (back to previous exercise's first set), `RESTART`, `TO_HOME`.

### 3D engine (`src/three/`)
- `skeleton.js` — `buildSkeleton(scene, material)` returns the joint map; `applyPose(joints, pose)` writes rotations. The keys returned by `buildSkeleton` MUST match the keys in every pose dict. If you add a new joint, update both poses and the skeleton.
- `bandRenderer.js` — `createBandRenderer(scene)` returns `{render, dispose}`. Owns its materials and the segment meshes; call `dispose()` from the viewer cleanup. Band color shifts lime → red as `dist / naturalLength` exceeds 1 (visual tension feedback). Sag is added when slack (`stretch < 1`).
- Band config types (in `exercise.band.type`):
  - `handToHand` — single segment between hands
  - `footToHand_dual` — two segments, one per side (foot→hand)
  - `overhead_to_feet` — single segment, mid-hands → mid-feet
  - `anchored_side` — fixed anchor mesh + segment to mid-hands; requires `anchorPos: [x,y,z]`

### Viewer (`src/components/ExerciseViewer.jsx`)
Builds the scene **once** in a `useEffect([])`. Props (`exerciseId`, `paused`) are piped through a `stateRef` so the animation loop reads current values without recreating the scene. Loop interpolates between consecutive keyframes with a smoothstep, calls `applyPose`, then `bands.render(exercise, joints)`. Camera orbit is mouse/touch drag + wheel zoom — recoded inline rather than using `OrbitControls` to keep the Three.js import minimal.

### Screens (`src/components/`)
`StartScreen`, `WorkoutScreen`, `CompleteScreen`; routed by `App.jsx` via the reducer flags `isStarted`/`isComplete`. `WorkoutScreen` is the only consumer of `ExerciseViewer`.
In mobile, entire screen with no scroll.

## Adding an exercise

1. Add the start/end poses to `poses.js` (use `d()` for degrees → radians; keep the joint key set).
2. Add the entry to `EXERCISES` with `keyframes` (usually `[start, end, start]`), `duration`, and a `band` config matching one of the four types above.
3. Add a row to `ROUTINE` with sets/work/rest/reps and a `phase` label (free-form Spanish string used for grouping on the start screen).

If a movement needs a pose shape no existing exercise uses, prefer reusing/extending existing poses over duplicating; many poses are shared across exercises (e.g. `rdlDown` and `rowStart`).

## Language

Entire app must be in Spanish; it is intended for Spanish-speaking users. Keep all user-facing copy in Spanish.
