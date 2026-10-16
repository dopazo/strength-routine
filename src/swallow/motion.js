import { EASE } from '../animation/easing.js';
import { EFFORT_KEYS, HEAD_POSES } from './headPoses.js';
import { bump, clamp01, lerp, smooth } from './shapes.js';

// Animación de las láminas de deglución: líneas de tiempo de poses (como el
// tempo de las repeticiones del muñeco 3D) y la masticación procedural.

const poseOf = (p) => (typeof p === 'string' ? HEAD_POSES[p] ?? {} : p ?? {});

export function lerpParams(a, b, k) {
  const out = {};
  for (const key in a) out[key] = a[key];
  for (const key in b) out[key] = lerp(a[key] ?? 0, b[key], k);
  for (const key in a) if (!(key in b)) out[key] = lerp(a[key], 0, k);
  return out;
}

// Una línea de tiempo es una lista de pasos:
//   { to: pose, dur, cue, effort? }  — ir a una pose
//   { hold: seg, cue, countdown?, pulse? } — quedarse (countdown: muestra
//                                     los segundos restantes; pulse: el
//                                     esfuerzo "late")
// `start` es la pose inicial.
export function buildTimeline(steps, start) {
  const segs = [];
  let t = 0;
  let pose = poseOf(start);
  for (const st of steps) {
    if (st.hold != null) {
      segs.push({ type: 'hold', start: t, dur: st.hold, from: pose, to: pose, cue: st.cue ?? '', countdown: !!st.countdown, pulse: !!st.pulse, effort: !!st.effort });
      t += st.hold;
    } else {
      const to = poseOf(st.to);
      segs.push({ type: 'move', start: t, dur: st.dur, from: pose, to, cue: st.cue ?? '', effort: !!st.effort, ease: EASE.transition });
      pose = to;
      t += st.dur;
    }
  }
  return { segs, duration: t, start: poseOf(start), end: pose };
}

function pulsed(params, t, amount = 0.22) {
  const f = 1 - amount + amount * (0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 1.3));
  const out = { ...params };
  for (const k of EFFORT_KEYS) if (out[k]) out[k] *= f;
  return out;
}

// Evalúa la línea de tiempo en `t` (segundos). Fuera de rango queda en la
// última pose.
export function sampleTimeline(tl, t) {
  if (t >= tl.duration) {
    return { params: { ...tl.end }, cue: '', countdown: null, progress: 1, effort: false, done: true };
  }
  const tt = Math.max(0, t);
  let seg = tl.segs[0];
  for (const s of tl.segs) {
    if (tt >= s.start) seg = s;
    else break;
  }
  const raw = seg.dur > 0 ? clamp01((tt - seg.start) / seg.dur) : 1;
  let params;
  if (seg.type === 'hold') {
    params = seg.pulse ? pulsed(seg.to, tt) : { ...seg.to };
  } else {
    params = lerpParams(seg.from, seg.to, seg.ease(raw));
  }
  return {
    params,
    cue: seg.cue,
    countdown: seg.countdown ? Math.max(0, seg.dur - (tt - seg.start)) : null,
    progress: tl.duration > 0 ? tt / tl.duration : 0,
    effort: seg.effort,
    done: false,
  };
}

// --- Masticación procedural ------------------------------------------------
// Ciclo masticatorio visto de frente (en "lágrima"): la mandíbula baja, se va
// hacia el lado que mastica, cierra por ese lado y vuelve al centro moliendo.
// Cada CHEWS_PER_SIDE masticadas la lengua pasa el chicle al otro lado.
const CHEW_SEC = 1.1;
const CHEWS_PER_SIDE = 8;
const SWITCH_SEC = 1.7;
const BLOCK = CHEWS_PER_SIDE * CHEW_SEC + SWITCH_SEC;

export function chewSample(t) {
  const tt = Math.max(0, t);
  const blk = Math.floor(tt / BLOCK);
  const u = tt - blk * BLOCK;
  const side = blk % 2 === 0 ? 1 : -1; // empieza por la derecha
  const chewing = CHEWS_PER_SIDE * CHEW_SEC;
  const base = { xray: 1, lipSeal: 1 };
  if (u < chewing) {
    const n = Math.floor(u / CHEW_SEC);
    const ph = (u - n * CHEW_SEC) / CHEW_SEC;
    const open = ph < 0.8 ? Math.sin(Math.PI * (ph / 0.8)) ** 1.25 : 0;
    const act = bump(ph, 0.66, 0.24);
    const work = 0.25 + 0.75 * act;
    const bal = 0.12 + 0.25 * act;
    return {
      params: {
        ...base,
        jaw: 7.2 * open,
        jawX: side * 2.8 * bump(ph, 0.5, 0.36),
        masR: side > 0 ? work : bal,
        masL: side > 0 ? bal : work,
        gum: side,
      },
      cue: 'MASTICA',
      side,
      progress: u / chewing,
      count: n + 1,
    };
  }
  // Cambio de lado: la boca apenas se abre y el chicle cruza.
  const k = (u - chewing) / SWITCH_SEC;
  return {
    params: { ...base, jaw: 2.4 * Math.sin(Math.PI * k), gum: side * (1 - 2 * smooth(k)), masL: 0.12, masR: 0.12 },
    cue: 'CAMBIA DE LADO',
    side: -side,
    progress: 1,
    switching: true,
  };
}

// --- Ejercicios -------------------------------------------------------------

const cache = new Map();
function cached(key, make) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
}

export const repTimeline = (id, ex) => cached(`rep|${id}`, () => buildTimeline(ex.rep, ex.idle));
export const demoTimeline = (id, ex) => cached(`demo|${id}`, () => buildTimeline(
  ex.demo ?? [...ex.rep, { hold: 1.4, cue: 'DESCANSA' }],
  ex.idle,
));

export function repDuration(id, ex) {
  return ex.rep ? repTimeline(id, ex).duration : 0;
}

// Isométrico sostenido durante `duration` segundos: entra, empuja (latiendo)
// y suelta al final.
function workSample(ex, t, duration) {
  const { from, pose, ramp = 0.6, cues = [] } = ex.work;
  const a = poseOf(from);
  const b = poseOf(pose);
  if (t < ramp) {
    return { params: lerpParams(a, b, EASE.transition(t / ramp)), cue: cues[0] ?? '', effort: true };
  }
  if (t > duration - ramp) {
    const k = clamp01((duration - t) / ramp);
    return { params: lerpParams(a, b, EASE.transition(k)), cue: cues[2] ?? '', effort: false };
  }
  return { params: pulsed(b, t), cue: cues[1] ?? '', effort: true };
}

// Punto de entrada del visor: qué mostrar para un ejercicio en un modo dado.
//   demo — la animación en bucle (vista previa, presentación del ejercicio)
//   rep  — una repetición guiada (t desde que se tocó "comenzar")
//   work — serie por tiempo (isométrico o masticación); `duration` en s
//   idle — pose de espera entre repeticiones o series
export function sampleExercise(id, ex, mode, t, { duration = 0 } = {}) {
  if (ex.procedural === 'chew') {
    if (mode === 'idle') return { params: { ...poseOf(ex.idle), lipSeal: 1 }, cue: 'DESCANSA', side: 1 };
    return chewSample(t);
  }
  if (mode === 'rep' && ex.rep) {
    const s = sampleTimeline(repTimeline(id, ex), t);
    return s;
  }
  if (mode === 'work' && ex.work) {
    return workSample(ex, t, duration);
  }
  if (mode === 'idle') {
    return { params: { ...poseOf(ex.idle) }, cue: '', effort: false };
  }
  const tl = demoTimeline(id, ex);
  return sampleTimeline(tl, ((t % tl.duration) + tl.duration) % tl.duration);
}
