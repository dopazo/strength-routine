// Pauta de deglución (fonoaudiología). La persona abre la app y hace en ese
// momento todo lo que le falta del día: cada sesión trae una vez cada
// ejercicio que todavía no llega a su frecuencia diaria.
//   sets      — series cada vez que se hace el ejercicio
//   reps      — repeticiones por serie (kind 'reps')
//   workSec   — segundos por serie (kind 'timed'); con `maxSec` el reloj cuenta
//               hacia arriba: `workSec` es el mínimo y `maxSec` el tope
//   perDay    — veces al día que indica la pauta (tope: no se ofrece más)
//   minPerDay — si la pauta da un rango (Masako: 3–4), desde cuántas veces el
//               día ya cuenta como cumplido
//   short     — nombre corto para el registro
//   note      — aclaración de la pauta (se muestra en la vista previa)
export const SWALLOW_ROUTINE = [
  {
    exerciseId: 'mendelsohn', sets: 1, reps: 10, perDay: 2, short: 'Mendelsohn',
    note: '10 repeticiones de 3 segundos, 2 veces al día (mañana y tarde).',
  },
  {
    exerciseId: 'lingual', sets: 3, workSec: 20, perDay: 2, short: 'Lingual',
    note: '3 series de 20 segundos, 2 veces al día (mañana y tarde).',
  },
  {
    exerciseId: 'masako', sets: 1, reps: 10, perDay: 4, minPerDay: 3, short: 'Masako',
    note: '3–4 series de 10 al día, repartidas en el día: una serie cada vez que haces la sesión. Se anotan las repeticiones logradas.',
  },
  {
    exerciseId: 'chewing', sets: 1, workSec: 600, maxSec: 900, perDay: 1, short: 'Chicle',
    note: '10–15 minutos, una vez al día.',
  },
];

// Texto corto de la dosis (lista y encabezados).
export function dosage(item) {
  if (item.maxSec) return `${Math.round(item.workSec / 60)}–${Math.round(item.maxSec / 60)} MIN`;
  if (item.reps) return item.sets > 1 ? `${item.sets}×${item.reps}` : `${item.reps} REPS`;
  return `${item.sets}×${item.workSec}S`;
}

// Frecuencia de la pauta en texto corto ("2×día", "3–4×día").
export const perDayLabel = (item) => `${item.minPerDay ? `${item.minPerDay}–` : ''}${item.perDay}×día`;

// Veces que se hizo hoy (`day` = registro del día, ver swallow/log.js). La
// masticación cuenta cuando llegó al mínimo de minutos.
export function timesToday(item, day) {
  if (item.maxSec) return day.chewDone ? 1 : 0;
  return day.rounds[item.exerciseId] ?? 0;
}

export const isPending = (item, day) => timesToday(item, day) < item.perDay;
export const isMet = (item, day) => timesToday(item, day) >= (item.minPerDay ?? item.perDay);

// Ejercicios de la sesión de ahora: los que aún no llegan a su frecuencia.
export function sessionItems(day) {
  return SWALLOW_ROUTINE.filter((r) => isPending(r, day));
}
