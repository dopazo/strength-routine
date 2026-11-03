// Señales de la sesión: un sonido sintetizado (Web Audio, sin archivos) y,
// en celulares que lo permiten, una vibración.
//
// Por qué suenan así:
// - Timbre de campanita (parciales inarmónicos de una barra metálica, con
//   golpe rápido y cola que se apaga): se distingue de la música o la TV y
//   se nota sin ser molesto.
// - Fundamentales entre ~700 y ~2100 Hz: el parlante del celular casi no
//   reproduce graves (los pitidos antiguos de 220–440 Hz se perdían) y con
//   la edad se pierde primero el oído para los agudos sobre ~4 kHz.
// - Todo pasa por un compresor que hace de limitador, así se puede subir el
//   volumen sin que sature.
//
// El lenguaje es siempre el mismo en los dos programas:
// - Por empezar (cuenta 3-2-1 antes del esfuerzo): golpecitos que SUBEN de
//   tono y, al empezar, una campanita doble rápida que sube ("ti-ding").
// - Por terminar (cuenta 3-2-1 del final del esfuerzo): golpecitos que BAJAN
//   y, al terminar, un "ding… dong" lento de timbre que baja.
// - Rutina terminada: arpegio de cuatro campanas.
// - Saltar ejercicio y cambiar de lado al masticar: un toque suave.
//
// La vibración usa la Vibration API: funciona en Android (Chrome, Firefox,
// Samsung Internet); Safari en iPhone no la tiene y simplemente no vibra.

let ctx = null;
let out = null;

export function ensureAudio() {
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    ctx = new Ctor();
    out = createOutput(ctx);
  }
  if (ctx.state === 'suspended') ctx.resume();
}

// Ganancia general → compresor/limitador → parlante.
function createOutput(c) {
  const limiter = c.createDynamicsCompressor();
  limiter.threshold.value = -10;
  limiter.knee.value = 6;
  limiter.ratio.value = 12;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.25;
  limiter.connect(c.destination);
  const master = c.createGain();
  master.gain.value = 1.4;
  master.connect(limiter);
  return master;
}

// Parciales [razón de frecuencia, amplitud, fracción del decaimiento].
// Campana: modos de una barra libre (como un metalófono), los agudos se
// apagan antes que la fundamental.
const BELL = [
  [1, 1, 1],
  [2, 0.4, 0.6],
  [2.76, 0.32, 0.42],
  [5.4, 0.12, 0.24],
  [8.93, 0.05, 0.14],
];
// Golpecito: como una tecla de marimba, seco y corto.
const TICK = [
  [1, 1, 1],
  [3.9, 0.28, 0.35],
  [9.2, 0.07, 0.18],
];

function strike(c, dest, freq, { at = 0, gain = 0.5, decay = 1, partials = BELL } = {}) {
  const t0 = c.currentTime + 0.005 + at;
  for (const [ratio, amp, dec] of partials) {
    const f = freq * ratio;
    if (f > 12000) continue;
    const end = t0 + decay * dec;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = f;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain * amp, t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(g);
    g.connect(dest);
    osc.start(t0);
    osc.stop(end + 0.05);
  }
}

// Cada señal: una lista de golpes y un patrón de vibración (ms).
const NOTE = {
  F5: 698, G5: 784, A5: 880, B5: 988, Cs6: 1109,
  C6: 1047, E6: 1319, G6: 1568, C7: 2093,
};

const tickStart = (n) => [
  { freq: [NOTE.A5, NOTE.B5, NOTE.Cs6][3 - clampCount(n)], partials: TICK, decay: 0.22, gain: 0.55 },
];
const tickEnd = (n) => [
  { freq: [NOTE.A5, NOTE.G5, NOTE.F5][3 - clampCount(n)], partials: TICK, decay: 0.22, gain: 0.55 },
];

const SIGNALS = {
  start: {
    notes: [
      { freq: NOTE.C6, gain: 0.45, decay: 0.5 },
      { freq: NOTE.G6, at: 0.12, gain: 0.5, decay: 1.1 },
    ],
    vibrate: [120, 60, 220],
  },
  end: {
    notes: [
      { freq: NOTE.E6, gain: 0.5, decay: 1.3 },
      { freq: NOTE.C6, at: 0.42, gain: 0.5, decay: 1.6 },
    ],
    vibrate: [450],
  },
  finish: {
    notes: [
      { freq: NOTE.C6, gain: 0.4, decay: 0.8 },
      { freq: NOTE.E6, at: 0.16, gain: 0.4, decay: 0.8 },
      { freq: NOTE.G6, at: 0.32, gain: 0.42, decay: 0.9 },
      { freq: NOTE.C7, at: 0.5, gain: 0.48, decay: 2 },
    ],
    vibrate: [150, 80, 150, 80, 500],
  },
  skip: {
    notes: [{ freq: 660, partials: TICK, decay: 0.15, gain: 0.3 }],
    vibrate: [30],
  },
  side: {
    notes: [
      { freq: NOTE.B5, partials: TICK, decay: 0.2, gain: 0.45 },
      { freq: NOTE.B5, at: 0.14, partials: TICK, decay: 0.2, gain: 0.45 },
    ],
    vibrate: [60, 80, 60],
  },
};

function clampCount(n) {
  return Math.min(3, Math.max(1, Math.round(n) || 1));
}

// Dibuja una señal en cualquier contexto de audio (también en un
// OfflineAudioContext, para escucharlas fuera de la app).
export function renderSignal(c, dest, name, n = 3) {
  const notes = name === 'tickStart' ? tickStart(n) : name === 'tickEnd' ? tickEnd(n) : SIGNALS[name].notes;
  for (const { freq, ...opts } of notes) strike(c, dest, freq, opts);
}

function vibrate(pattern) {
  try {
    if (document.visibilityState === 'visible') navigator.vibrate?.(pattern);
  } catch {
    // Sin vibración: queda solo el sonido.
  }
}

function play(name, n, pattern) {
  vibrate(pattern);
  if (!ctx || ctx.state !== 'running') return;
  renderSignal(ctx, out, name, n);
}

// Cuenta regresiva: n = 3, 2, 1 segundos que faltan.
export function playStartTick(n) {
  play('tickStart', n, [60]);
}
export function playEndTick(n) {
  play('tickEnd', n, [60]);
}
export function playStart() {
  play('start', 0, SIGNALS.start.vibrate);
}
export function playEnd() {
  play('end', 0, SIGNALS.end.vibrate);
}
export function playFinish() {
  play('finish', 0, SIGNALS.finish.vibrate);
}
export function playSkip() {
  play('skip', 0, SIGNALS.skip.vibrate);
}
export function playSideChange() {
  play('side', 0, SIGNALS.side.vibrate);
}
