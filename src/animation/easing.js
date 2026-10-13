// Curva cubic-bezier igual a la de CSS: P0 = (0,0), P3 = (1,1).
// Devuelve f(x) para x en [0, 1].
export function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t) => (3 * ax * t + 2 * bx) * t + cx;

  function solveT(x) {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = sampleX(t) - x;
      if (Math.abs(err) < 1e-6) return t;
      const d = slopeX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    // Respaldo por bisección si Newton no converge.
    let lo = 0;
    let hi = 1;
    t = x;
    for (let i = 0; i < 30; i++) {
      const v = sampleX(t);
      if (Math.abs(v - x) < 1e-6) break;
      if (v < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return t;
  }

  return (x) => (x <= 0 ? 0 : x >= 1 ? 1 : sampleY(solveT(x)));
}

export const smoothstep = (t) => t * t * (3 - 2 * t);

export const EASE = {
  // Fase concéntrica: arranque decidido y frenado largo, porque la banda
  // opone más resistencia cuanto más se estira.
  concentric: cubicBezier(0.3, 0, 0.2, 1),
  // Fase excéntrica: velocidad casi constante (controlada) con extremos suaves.
  eccentric: cubicBezier(0.25, 0, 0.75, 1),
  // Transiciones entre poses (cambio de ejercicio, descanso).
  transition: cubicBezier(0.45, 0, 0.25, 1),
};
