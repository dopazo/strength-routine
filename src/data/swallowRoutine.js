// Pauta de deglución: todos los días, mañana y tarde (AM y PM).
//   sets     — series por sesión
//   reps     — repeticiones por serie (kind 'reps')
//   workSec  — segundos por serie (kind 'timed'); con `maxSec` el reloj cuenta
//              hacia arriba: `workSec` es el mínimo y `maxSec` el tope
//   perDay   — veces al día indicadas en la pauta (1: basta una sesión al día)
//   note     — aclaración de la pauta (se muestra en la vista previa)
export const SESSIONS_PER_DAY = 2;

export const SWALLOW_ROUTINE = [
  { exerciseId: 'mendelsohn', sets: 1, reps: 10, perDay: 2, note: '10 repeticiones de 3 segundos.' },
  { exerciseId: 'lingual', sets: 3, workSec: 20, perDay: 2, note: '3 series de 20 segundos.' },
  {
    exerciseId: 'masako', sets: 2, reps: 10, perDay: 2,
    note: 'La pauta pide 3–4 series de 10 al día, repartidas en ratos libres: 2 por sesión. Se anotan las repeticiones logradas.',
  },
  { exerciseId: 'chewing', sets: 1, workSec: 600, maxSec: 900, perDay: 1, note: '10–15 minutos, una vez al día.' },
];

// Texto corto de la dosis (lista y encabezados).
export function dosage(item) {
  if (item.maxSec) return `${Math.round(item.workSec / 60)}–${Math.round(item.maxSec / 60)} MIN`;
  if (item.reps) return item.sets > 1 ? `${item.sets}×${item.reps}` : `${item.reps} REPS`;
  return `${item.sets}×${item.workSec}S`;
}

// Ejercicios de una sesión completa. Los que van una vez al día (perDay 1)
// se omiten si ya se hicieron hoy.
export function sessionItems({ doneToday = [] } = {}) {
  return SWALLOW_ROUTINE.filter((r) => !(r.perDay === 1 && doneToday.includes(r.exerciseId)));
}

export const perDayLabel = (item) => (item.perDay === 1 ? '1 vez al día' : `${item.perDay} veces al día`);
