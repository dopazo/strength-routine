export const TRANSITION_SEC = 60;

export const ROUTINE = [
  { exerciseId: 'pullApart', sets: 2, workSec: 35, restSec: 30, reps: '15',       phase: 'Calentamiento' },
  { exerciseId: 'press',     sets: 4, workSec: 45, restSec: 60, reps: '10-12',    phase: 'Empuje' },
  { exerciseId: 'tricep',    sets: 4, workSec: 40, restSec: 50, reps: '12-15',    phase: 'Empuje' },
  { exerciseId: 'row',       sets: 4, workSec: 45, restSec: 60, reps: '10-12',    phase: 'Tracción' },
  { exerciseId: 'curl',      sets: 4, workSec: 40, restSec: 50, reps: '12',       phase: 'Tracción' },
  { exerciseId: 'squat',     sets: 4, workSec: 50, restSec: 75, reps: '10-12',    phase: 'Piernas' },
  { exerciseId: 'hipThrust', sets: 4, workSec: 50, restSec: 75, reps: '10-12',    phase: 'Piernas' },
  { exerciseId: 'woodchopperL', sets: 2, workSec: 40, restSec: 45, reps: '8',  phase: 'Core' },
  { exerciseId: 'woodchopperR', sets: 2, workSec: 40, restSec: 45, reps: '8',  phase: 'Core' },
  { exerciseId: 'lateral',   sets: 3, workSec: 35, restSec: 45, reps: '15',       phase: 'Finalización' },
];

export const TOTAL_DURATION = ROUTINE.reduce((sum, r, i) => {
  let t = r.sets * r.workSec + (r.sets - 1) * r.restSec;
  if (i < ROUTINE.length - 1) t += TRANSITION_SEC;
  return sum + t;
}, 0);

export const EXERCISE_BOUNDARIES = (() => {
  const out = [];
  let acc = 0;
  for (let i = 0; i < ROUTINE.length - 1; i++) {
    const r = ROUTINE[i];
    acc += r.sets * r.workSec + (r.sets - 1) * r.restSec + TRANSITION_SEC;
    out.push((acc / TOTAL_DURATION) * 100);
  }
  return out;
})();
