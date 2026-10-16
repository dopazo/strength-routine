// Ejercicios de musculatura de la deglución (pauta de fonoaudiología).
// Cada ejercicio describe qué se le muestra a la persona y cómo se anima la
// lámina de la cabeza (poses en src/swallow/headPoses.js):
//
//   name, target  — nombre y qué trabaja (se muestran en la lista y el visor)
//   instructions  — texto de la pauta, en español
//   tip           — recordatorio opcional (p. ej. el vaso de agua)
//   kind          — 'reps': la persona toca para iniciar cada repetición y la
//                   lámina la guía; 'timed': series por tiempo (cuenta atrás,
//                   o hacia arriba si la rutina define `maxSec`)
//   views         — vistas disponibles: 'side' (corte) y/o 'front' (frente);
//                   la primera es la inicial
//   labels        — estructuras rotuladas por vista (ver views.js)
//   idle          — pose de espera entre repeticiones o series
//   rep           — línea de tiempo de una repetición guiada (kind 'reps'):
//                   { to: pose, dur, cue, effort? } · { hold: s, cue, countdown?, pulse? }
//   work          — serie sostenida (kind 'timed'): { from, pose, ramp, cues:
//                   [al empujar, sosteniendo, al soltar] }
//   demo          — bucle para la vista previa (por defecto: `rep` + descanso)
//   procedural    — 'chew': la animación la genera chewSample (motion.js)
export const SWALLOW_EXERCISES = {
  mendelsohn: {
    name: 'Ejercicio de Mendelsohn',
    target: 'Elevación de la laringe',
    instructions: 'Traga normalmente y mantén la laringe arriba 3 segundos. Puedes tocar tu cuello para sentir el movimiento. Luego descansa.',
    kind: 'reps',
    views: ['side', 'front'],
    labels: { side: ['larynx', 'tongue', 'epiglottis'], front: ['larynx'] },
    idle: 'mRest',
    rep: [
      { to: 'mPrep', dur: 0.5, cue: 'TRAGA', effort: true },
      { to: 'mOral', dur: 0.5, cue: 'TRAGA', effort: true },
      { to: 'mPharynx', dur: 0.4, cue: 'TRAGA', effort: true },
      { to: 'mHold', dur: 0.4, cue: 'MANTÉN ARRIBA', effort: true },
      { hold: 3, cue: 'MANTÉN ARRIBA', countdown: true, pulse: true, effort: true },
      { to: 'mRest', dur: 1, cue: 'SUELTA' },
    ],
  },
  lingual: {
    name: 'Isométrico lingual',
    target: 'Fuerza de la lengua',
    instructions: 'Sube la lengua y pégala contra el paladar, empujando con fuerza. Haz pausas si lo necesitas.',
    kind: 'timed',
    views: ['side', 'front'],
    labels: { side: ['tongue', 'palate'], front: ['tongue'] },
    idle: 'rest',
    work: { from: 'lOpen', pose: 'lPress', ramp: 0.6, cues: ['EMPUJA', 'EMPUJA FUERTE', 'SUELTA'] },
    demo: [
      { to: 'lOpen', dur: 0.8, cue: 'ABRE LA BOCA' },
      { hold: 0.4, cue: 'ABRE LA BOCA' },
      { to: 'lPress', dur: 0.6, cue: 'EMPUJA', effort: true },
      { hold: 2.6, cue: 'EMPUJA FUERTE', pulse: true, effort: true },
      { to: 'lOpen', dur: 0.6, cue: 'SUELTA' },
      { to: 'rest', dur: 0.8, cue: 'DESCANSA' },
      { hold: 0.8, cue: 'DESCANSA' },
    ],
  },
  masako: {
    name: 'Ejercicio de Masako',
    target: 'Pared de la faringe',
    instructions: 'Coloca la lengua entre los dientes, lo más afuera posible, y traga de esa forma.',
    tip: 'Ten un vaso de agua cerca para humedecer la boca.',
    kind: 'reps',
    views: ['side', 'front'],
    labels: { side: ['tongue', 'wall'], front: [] },
    idle: 'rest',
    rep: [
      { to: 'kOut', dur: 0.9, cue: 'LENGUA AFUERA' },
      { hold: 0.5, cue: 'LENGUA AFUERA' },
      { to: 'kPrep', dur: 0.35, cue: 'TRAGA', effort: true },
      { to: 'kSwallow', dur: 0.5, cue: 'TRAGA', effort: true },
      { hold: 0.6, cue: 'TRAGA', effort: true },
      { to: 'kAfter', dur: 0.6, cue: 'TRAGA', effort: true },
      { to: 'rest', dur: 0.9, cue: 'RELAJA' },
    ],
  },
  chewing: {
    name: 'Masticación',
    target: 'Musculatura masticatoria',
    instructions: 'Mastica chicle alternando ambos lados, un rato a cada lado, para mantener la función masticatoria.',
    kind: 'timed',
    views: ['front'],
    labels: { front: [] },
    idle: 'chewRest',
    procedural: 'chew',
  },
};
