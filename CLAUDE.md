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

Four layers stacked from data → animation → engine → UI. Adding a new exercise touches data mostly.

### Data (`src/data/`)
- `poses.js` — each pose is a flat dict of Euler XYZ joint angles (`shoulderL`, `elbowR`, `hipL`, `kneeR`, …) plus `rootPos` (world position of the pelvis = hip-joint center; standing ≈ `[0, 1.0, 0]`), `rootRot`, `torsoRot`. Optional: `headRot` (otherwise the head compensates part of the torso lean) and `lumbarRot` + `thoracicRot` (explicit spine segments; otherwise `torsoRot` is split between hip hinge and upper spine). Angles in radians via `d()` from `utils.js`. Every pose should leave the ankles at y ≈ 0.07 (feet flat on the floor). The header comment documents the axis conventions (figure faces +Z, "L" side is x<0).
- `exercises.js` — `keyframes` (pose ids, typically `[A, B, A]`), `concentric` (index of the effort segment, default 0), `tempo` (relative durations `[move, hold, move, hold…]`), `cues` (Spanish text per segment, shown in the viewer HUD), `works` (tintable mesh keys), `camera` (`{yaw, pitch, dist, target}`), `restPose`, `plantHands` / `handPath`, and a `band` config. The header comment documents every field.
- `routine.js` — ordered list of `{exerciseId, sets, workSec, restSec, reps, phase}`. `TOTAL_DURATION` is computed at module load and used for the progress bar. `workSec` and `reps` also drive the animation tempo.

### Animation (`src/animation/`) — pure logic, no Three.js
- `easing.js` — CSS-style `cubicBezier()`; `EASE.concentric` (fast start, long deceleration), `EASE.eccentric` (controlled, near-constant speed), `EASE.transition`.
- `tempo.js` — `buildRepPlan(exercise, {workSec, reps})` scales the tempo so `reps` (upper bound of a range like `'10-12'`) fill `workSec` after a 1 s lead-in; `sampleRep(plan, t)` returns the poses to blend, eased factor, ROM progress, rep index, activation and cue.
- `director.js` — `createDirector()` returns `evaluate(ctx, t)`: maps the workout phase + seconds elapsed in it to what the viewer shows. `work` → rep cycle; `rest` → `restPose`, then the start pose for the last `PREP_SEC`; `transition` → next exercise's rest pose, a preview loop of the next exercise, then its start pose. `demo`/`pose` modes serve the Pose Lab.

### State machine (`src/state/workoutReducer.js`)
`useReducer`-driven. Phases cycle `work → rest → work …` until the last set, then `transition → work` of the next exercise. Last `work` of the last exercise sets `isComplete`. `App.jsx` runs a 100ms `setInterval` dispatching `TICK` with `delta: 0.1`. Action types: `START`, `TICK`, `TOGGLE_PAUSE`, `NEXT` (skip remaining time of current phase), `PREV` (back to previous exercise's first set), `RESTART`, `TO_HOME`.

### 3D engine (`src/three/`)
- `skeleton.js` — `buildSkeleton(parent, material, {meshes})` builds the mannequin. `root` is the pelvis; legs hang from it, the torso is `lumbar` (pivots at the hips) → `thoracic` → `neck`/arms. Returns the joints listed in `RIG_JOINTS`, ankles, contact points (`handL/R` grip, `footL/R` and `soleOuterL/R` under the soles) and `capsules` (band colliders). For mobile performance every piece hanging from the same bone is merged into one mesh sharing a single material (`createBodyMaterial`, 13 draw calls for the whole body): each vertex carries a `muscle` attribute and the shader tints it from `applyTint(material, levels)`. Tintable keys are listed in `MUSCLES` (`chest`, `upperBack`, `abs`, `lowerBack`, `glutes`, `shoulderCapL/R`, `bicepsL/R`, `tricepsL/R`, `forearmL/R`, `quadsL/R`, `hamstringsL/R`, `shinL/R`); exercises reference them in `works`. If you add a joint, update `RIG_JOINTS`, the skeleton, `poseToRig` and the poses.
- `rig.js` — `poseToRig(pose)` converts a pose dict to quaternions once (memoized); `blendRig` interpolates with slerp; `applyRig` writes the skeleton; `rigContacts` computes hand/ankle world positions via a mesh-less scratch skeleton; `solveLeg`/`solveArm` are analytic two-bone IK (bend plane taken from the FK pose); `orientFoot` keeps feet flat.
- `bandRenderer.js` — `createBandSystem(scene)` returns `{setExercise, update, dispose}`. Each free band segment is a Verlet rope (stretch-only distance constraints, bending stiffness, gravity, floor friction, collision with the body capsules) drawn as a flat double-sided ribbon whose buffers are allocated once. Color shifts lime → amber → red with stretch and the ribbon narrows as it stretches. Natural length is derived from the keyframes (`minStretch`) unless `naturalLength` is set. Switching exercise fades the old band out and the new one in.
- Band config types (in `exercise.band.type`):
  - `handToHand` — single segment between hands
  - `footToHand_dual` — middle stepped on: strip under both feet + one segment per side (foot→hand)
  - `overhead_to_feet` — single segment, mid-hands → mid-feet
  - `oneFoot_to_handMid` — one foot (`foot: 'L'|'R'`) → mid-hands
  - `handToHand_overHip` — arc over the pelvis + one segment to each hand
  - `anchored_side` — fixed anchor mesh + segment to mid-hands; requires `anchorPos: [x,y,z]`
- `cameraRig.js` — hand-rolled orbit camera (no `OrbitControls`): damped glide to each exercise's `camera` view, pointer drag to orbit, wheel/pinch to zoom; the user's offset resets when the exercise changes.
- `exerciseScene.js` — `createExerciseScene(container, {onFrame})` returns `{setContext, setPaused, dispose}`. Owns renderer, lights, shadows and floor. Per frame: a smooth clock synced to the reducer's elapsed time → director → target pose; an automatic crossfade on any discontinuity (phase or exercise change, user skips), routed through `crouchLow`/`sitFloor` when going between standing and floor postures; secondary motion (breathing, weight shift, head); feet always IK-planted at the anchor pose (hands too with `plantHands`, or along a straight path with `handPath`); band physics; muscle tint from activation; camera. The shadow map is refreshed every other frame. Adaptive quality: if the viewer can't sustain ~45 fps it lowers the pixel ratio, then swaps real-time shadows for a cheap contact shadow.

### Viewer (`src/components/ExerciseViewer.jsx`)
Lazy-loaded: `WorkoutScreen` imports it through `viewerLoader.js`, so Three.js lives in a separate chunk that `App.jsx` preloads while the start screen is idle (the start screen only downloads ~70 KB gzip). Creates the scene **once** in a `useEffect([])`; props (`exerciseId`, `nextExerciseId`, `phase`, `phaseKey`, `phaseElapsed`, `phaseDuration`, `workSec`, `reps`, `paused`) are forwarded with `setContext`/`setPaused`, so the scene is never rebuilt. The HUD (rep counter, cue, ROM bar, preview label) is written straight to the DOM from the frame callback, without React re-renders.

### Screens (`src/components/`)
`StartScreen`, `WorkoutScreen`, `CompleteScreen`; routed by `App.jsx` via the reducer flags `isStarted`/`isComplete`. `WorkoutScreen` and `ExercisePreview` consume `ExerciseViewer`. Tapping an exercise on the start screen opens `ExercisePreview`, a floating modal that mounts its own viewer in `demo` mode with `freeRun` (looped, orbitable) and disposes it on close; it closes with the X, a tap on the backdrop, or Escape.
In mobile, entire screen with no scroll.

### Pose Lab (`src/dev/PoseLab.jsx`)
Dev-only tool: `bun run dev` → `http://localhost:5173/strength-routine/?lab`. Plays any exercise (looped, frozen at a time, or in work/rest/transition mode), edits a pose with sliders and copies it in `poses.js` format. URL params (`ex`, `mode`, `t`, `pose`, `yaw`, `pitch`, `dist`, `ty`, `capture=1`) make it scriptable for screenshots. `main.jsx` only loads it when `import.meta.env.DEV`, so it is stripped from production builds.

## Adding an exercise

1. Add the start/end poses to `poses.js` (use `d()` for degrees → radians; keep the joint key set; ankles at y ≈ 0.07). Tune them in the Pose Lab and paste the copied output.
2. Add the entry to `EXERCISES` with `keyframes` (usually `[start, end, start]`), a `band` config matching one of the types above, and optionally `concentric`, `tempo`, `cues`, `works`, `camera`, `restPose`, `plantHands`/`handPath`.
3. Add a row to `ROUTINE` with sets/work/rest/reps and a `phase` label (free-form Spanish string used for grouping on the start screen).

If a movement needs a pose shape no existing exercise uses, prefer reusing/extending existing poses over duplicating; many poses are shared across exercises (e.g. `standing` is the default rest pose).

## Language

Entire app must be in Spanish; it is intended for Spanish-speaking users. Keep all user-facing copy in Spanish.
