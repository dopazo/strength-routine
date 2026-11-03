// Tiempo para cambiar de ejercicio (acomodar la banda). Una fila puede
// definir `transitionSec` para el cambio que viene después de ella.
export const TRANSITION_SEC = 30;

export const ROUTINE = [
  { exerciseId: 'pullApart', sets: 2, workSec: 35, restSec: 20, reps: '15',       phase: 'Calentamiento' },
  { exerciseId: 'press',     sets: 4, workSec: 45, restSec: 40, reps: '10-12',    phase: 'Empuje' },
  { exerciseId: 'tricep',    sets: 4, workSec: 40, restSec: 30, reps: '12-15',    phase: 'Empuje' },
  { exerciseId: 'row',       sets: 4, workSec: 45, restSec: 30, reps: '10-12',    phase: 'Tracción' },
  { exerciseId: 'curl',      sets: 4, workSec: 40, restSec: 35, reps: '12',       phase: 'Tracción' },
  { exerciseId: 'squat',     sets: 4, workSec: 50, restSec: 30, reps: '10-12',    phase: 'Piernas' },
  { exerciseId: 'hipThrust', sets: 4, workSec: 50, restSec: 50, reps: '10-12',    phase: 'Piernas' },
  { exerciseId: 'woodchopperL', sets: 2, workSec: 40, restSec: 30, reps: '8',  phase: 'Core', transitionSec: 10 },
  { exerciseId: 'woodchopperR', sets: 2, workSec: 40, restSec: 30, reps: '8',  phase: 'Core' },
  { exerciseId: 'lateral',   sets: 3, workSec: 35, restSec: 30, reps: '15',       phase: 'Finalización' },
];

// Segundos del cambio que sigue al ejercicio i (0 después del último).
export function transitionAfter(i) {
  if (i >= ROUTINE.length - 1) return 0;
  return ROUTINE[i].transitionSec ?? TRANSITION_SEC;
}

export const TOTAL_DURATION = ROUTINE.reduce((sum, r, i) => {
  return sum + r.sets * r.workSec + (r.sets - 1) * r.restSec + transitionAfter(i);
}, 0);

export const EXERCISE_BOUNDARIES = (() => {
  const out = [];
  let acc = 0;
  for (let i = 0; i < ROUTINE.length - 1; i++) {
    const r = ROUTINE[i];
    acc += r.sets * r.workSec + (r.sets - 1) * r.restSec + transitionAfter(i);
    out.push((acc / TOTAL_DURATION) * 100);
  }
  return out;
})();
