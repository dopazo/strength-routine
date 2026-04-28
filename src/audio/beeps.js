let ctx = null;

export function ensureAudio() {
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') ctx.resume();
}

function tone(freq, duration, gain) {
  if (!ctx || ctx.state !== 'running') return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  const now = ctx.currentTime;
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(gain, now + 0.01);
  g.gain.linearRampToValueAtTime(0, now + duration);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

export function playCountdownBeep() {
  tone(440, 0.40, 0.18);
}

export function playPhaseChangeBeep() {
  tone(880, 0.20, 0.22);
}

export function playSkipBeep() {
  tone(220, 0.12, 0.07);
}
