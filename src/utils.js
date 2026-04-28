export const d = (deg) => (deg * Math.PI) / 180;

export function formatTime(sec) {
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const lerp = (a, b, t) => a + (b - a) * t;
export const lerpArr = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));

export function blendPose(p1, p2, t) {
  const out = {};
  for (const k in p1) out[k] = lerpArr(p1[k], p2[k], t);
  return out;
}
