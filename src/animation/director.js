import { EXERCISES } from '../data/exercises.js';
import { buildRepPlan, sampleRep } from './tempo.js';

// Últimos segundos del descanso/transición en que el muñeco toma la posición
// inicial del ejercicio ("prepárate").
export const PREP_SEC = 2.5;
// En la transición entre ejercicios, tiempo para acomodarse (p. ej. tenderse
// en el suelo) antes de empezar la vista previa del próximo ejercicio.
export const PREVIEW_DELAY = 3.5;

const restPoseOf = (ex) => ex.restPose ?? 'standing';

// El director traduce el estado del entrenamiento (fase + segundos
// transcurridos en ella) a qué debe mostrar el visor:
//   { exerciseId, from, to, k, anchor, activation, mode, hud }
// `from`/`to` son poses (id o dict) y `k` el factor de mezcla ya suavizado.
// `anchor` es la pose cuyos pies (y manos, si `plantHands`) quedan fijos.
export function createDirector() {
  const plans = new Map();

  function planFor(exerciseId, workSec, reps) {
    const key = `${exerciseId}|${workSec ?? ''}|${reps ?? ''}`;
    let plan = plans.get(key);
    if (!plan) {
      plan = buildRepPlan(EXERCISES[exerciseId], { workSec, reps });
      plans.set(key, plan);
    }
    return plan;
  }

  function still(exerciseId, pose, mode, hud) {
    return { exerciseId, from: pose, to: pose, k: 0, anchor: pose, activation: 0, mode, hud };
  }

  function cycle(exerciseId, plan, t, mode, hudExtra, activationScale = 1) {
    const s = sampleRep(plan, t);
    return {
      exerciseId, from: s.from, to: s.to, k: s.k, anchor: plan.start,
      activation: s.activation * activationScale, mode,
      hud: {
        ...hudExtra, cue: s.cue, effort: s.effort, rom: s.rom, phase: s.phase,
        rep: s.repIndex + 1, total: plan.totalReps,
      },
    };
  }

  return function evaluate(ctx, t) {
    const ex = EXERCISES[ctx.exerciseId];
    switch (ctx.phase) {
      case 'work':
        return cycle(ctx.exerciseId, planFor(ctx.exerciseId, ctx.workSec, ctx.reps), t, 'work', { kind: 'rep' });

      case 'rest': {
        if (t >= ctx.phaseDuration - PREP_SEC) {
          return still(ctx.exerciseId, ex.keyframes[0], 'prep', { kind: 'rest', cue: 'PREPÁRATE' });
        }
        return still(ctx.exerciseId, restPoseOf(ex), 'rest', { kind: 'rest', cue: 'RESPIRA' });
      }

      case 'transition': {
        const nextId = ctx.nextExerciseId ?? ctx.exerciseId;
        const next = EXERCISES[nextId];
        const hud = { kind: 'preview', name: next.name };
        if (t >= ctx.phaseDuration - PREP_SEC) {
          return still(nextId, next.keyframes[0], 'prep', { ...hud, cue: 'PREPÁRATE' });
        }
        if (t < PREVIEW_DELAY) {
          return still(nextId, restPoseOf(next), 'rest', { ...hud, cue: '' });
        }
        return cycle(nextId, planFor(nextId), t - PREVIEW_DELAY, 'preview', hud, 0.6);
      }

      // Usados por el Pose Lab: pose fija o ejercicio en bucle con tempo base.
      case 'pose':
        return still(ctx.exerciseId, ctx.pose, 'pose', { kind: 'none' });
      default:
        return cycle(ctx.exerciseId, planFor(ctx.exerciseId), t, 'demo', { kind: 'demo' });
    }
  };
}
