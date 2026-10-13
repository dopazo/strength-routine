import { EASE } from './easing.js';

// Segundos de preparación al iniciar cada serie antes de la primera repetición.
export const LEAD_IN = 1;
// Si hay tiempo de sobra, el tempo base se estira como máximo este factor;
// el resto se convierte en pausa entre repeticiones.
const MAX_STRETCH = 1.5;

// '15' → 15 · '10-12' → 12 (se apunta al tope del rango).
export function parseReps(reps) {
  const nums = String(reps ?? '').match(/\d+/g)?.map(Number) ?? [];
  return nums.length ? Math.max(...nums) : 10;
}

// Tempo por defecto: concéntrica 1 · pausa 0.35 · excéntrica 2 · pausa 0.45.
function defaultTempo(segCount, concentric) {
  const out = [];
  for (let i = 0; i < segCount; i++) {
    const effort = i === concentric;
    out.push(effort ? 1 : 2, effort ? 0.35 : 0.45);
  }
  return out;
}

// Posición de cada keyframe dentro del rango de movimiento (0 = inicio,
// 1 = punto más lejano). Para [A, B, A] → [0, 1, 0].
function romOf(keyframes) {
  const unique = [...new Set(keyframes)];
  const span = Math.max(1, unique.length - 1);
  return keyframes.map((k) => unique.indexOf(k) / span);
}

// Nivel de activación muscular (0..1) usado para teñir los músculos: crece
// con el rango de movimiento, así es continuo entre tramos y pausas.
const activationAt = (rom) => 0.4 + 0.6 * rom;

// Construye el plan de una repetición: tramos de movimiento (keyframe i → i+1)
// y pausas. Con `workSec` y `reps` la duración se ajusta para que las
// repeticiones calcen exactamente con el tiempo de trabajo de la serie; sin
// ellos se usa el tempo base (vista previa).
export function buildRepPlan(exercise, { workSec, reps } = {}) {
  const kf = exercise.keyframes;
  const segCount = kf.length - 1;
  const concentric = exercise.concentric ?? 0;
  const tempo = exercise.tempo ?? defaultTempo(segCount, concentric);
  const base = tempo.reduce((s, v) => s + v, 0);
  const totalReps = reps != null && workSec ? parseReps(reps) : null;

  let scale = 1;
  let extraHold = 0;
  if (totalReps) {
    const repDuration = Math.max(1, (workSec - LEAD_IN) / totalReps);
    scale = Math.min(repDuration / base, MAX_STRETCH);
    extraHold = repDuration - base * scale;
  }

  const rom = romOf(kf);
  const cues = exercise.cues ?? [];
  const segments = [];
  let t = 0;
  for (let i = 0; i < segCount; i++) {
    const effort = i === concentric;
    const move = (tempo[2 * i] ?? 1) * scale;
    let hold = (tempo[2 * i + 1] ?? 0) * scale;
    if (i === segCount - 1) hold += extraHold;
    segments.push({
      type: 'move', start: t, dur: move, from: kf[i], to: kf[i + 1],
      romFrom: rom[i], romTo: rom[i + 1], effort,
      ease: effort ? EASE.concentric : EASE.eccentric,
      cue: cues[i] ?? (effort ? 'ESFUERZO' : 'CONTROLA'),
    });
    t += move;
    if (hold > 0.001) {
      const r = rom[i + 1];
      segments.push({
        type: 'hold', start: t, dur: hold, from: kf[i + 1], to: kf[i + 1],
        romFrom: r, romTo: r, effort,
        cue: effort && r >= 0.5 ? 'MANTÉN' : '',
      });
      t += hold;
    }
  }
  return { segments, repDuration: t, totalReps, leadIn: totalReps ? LEAD_IN : 0, start: kf[0] };
}

// Evalúa el plan en el segundo `t` desde el inicio de la serie.
export function sampleRep(plan, t) {
  const first = plan.segments[0];
  if (t < plan.leadIn) {
    return {
      phase: 'lead', from: plan.start, to: plan.start, k: 0, rom: 0,
      repIndex: 0, activation: activationAt(0), cue: 'LISTO', effort: false,
    };
  }
  const u = t - plan.leadIn;
  let repIndex = Math.floor(u / plan.repDuration);
  if (plan.totalReps && repIndex >= plan.totalReps) {
    return {
      phase: 'done', from: plan.start, to: plan.start, k: 0, rom: 0,
      repIndex: plan.totalReps - 1, activation: activationAt(0), cue: '', effort: false,
    };
  }
  repIndex = Math.max(0, repIndex);
  const local = u - repIndex * plan.repDuration;
  let seg = first;
  for (const s of plan.segments) {
    if (local >= s.start) seg = s;
    else break;
  }
  const raw = seg.dur > 0 ? Math.min(1, (local - seg.start) / seg.dur) : 1;
  if (seg.type === 'hold') {
    return {
      phase: 'hold', from: seg.from, to: seg.to, k: 0, rom: seg.romFrom,
      repIndex, activation: activationAt(seg.romFrom),
      cue: seg.cue, effort: seg.effort,
    };
  }
  const k = seg.ease(raw);
  const rom = seg.romFrom + (seg.romTo - seg.romFrom) * k;
  return {
    phase: 'move', from: seg.from, to: seg.to, k, rom,
    repIndex, activation: activationAt(rom), cue: seg.cue, effort: seg.effort,
  };
}
