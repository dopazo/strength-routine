// Utilidades 2D para las animaciones de deglución (SVG).
//
// Las formas se describen con puntos de control y se dibujan como curvas
// Catmull-Rom convertidas a Bézier cúbicas: así basta mover pocos puntos para
// que el contorno se deforme con suavidad. Un punto con `c: 1` es una esquina
// (la curva no se suaviza ahí).

const f = (v) => (Math.round(v * 100) / 100).toString();

// Camino SVG suave que pasa por `pts` ([{x, y, c?}]). `tension` 1 = Catmull-Rom.
export function smoothPath(pts, closed = true, tension = 1) {
  const n = pts.length;
  if (n < 2) return '';
  const at = (i) => {
    if (closed) return pts[(i + n) % n];
    return pts[Math.max(0, Math.min(n - 1, i))];
  };
  const k = tension / 6;
  let d = `M${f(pts[0].x)} ${f(pts[0].y)}`;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    let c1x;
    let c1y;
    let c2x;
    let c2y;
    if (p1.c) {
      c1x = p1.x + (p2.x - p1.x) / 3;
      c1y = p1.y + (p2.y - p1.y) / 3;
    } else {
      c1x = p1.x + (p2.x - p0.x) * k;
      c1y = p1.y + (p2.y - p0.y) * k;
    }
    if (p2.c) {
      c2x = p2.x - (p2.x - p1.x) / 3;
      c2y = p2.y - (p2.y - p1.y) / 3;
    } else {
      c2x = p2.x - (p3.x - p1.x) * k;
      c2y = p2.y - (p3.y - p1.y) * k;
    }
    d += `C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(p2.x)} ${f(p2.y)}`;
  }
  return closed ? `${d}Z` : d;
}

export function ellipsePath(cx, cy, rx, ry, rot = 0) {
  // Elipse como 8 puntos suavizados (permite deformarla igual que el resto).
  const pts = [];
  const cr = Math.cos(rot);
  const sr = Math.sin(rot);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const x = Math.cos(a) * rx;
    const y = Math.sin(a) * ry;
    pts.push({ x: cx + x * cr - y * sr, y: cy + x * sr + y * cr });
  }
  return smoothPath(pts, true, 1.1);
}

// Gira (x, y) alrededor de (px, py) un ángulo `a` (radianes; positivo = horario
// en pantalla, porque en SVG la y crece hacia abajo).
export function rotateAbout(x, y, px, py, a) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const dx = x - px;
  const dy = y - py;
  return { x: px + dx * c - dy * s, y: py + dx * s + dy * c };
}

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const smooth = (t) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

// Campana suave: 1 en `c`, 0 a distancia `r` o más.
export function bump(v, c, r) {
  const t = 1 - Math.abs(v - c) / r;
  return t <= 0 ? 0 : t * t * (3 - 2 * t);
}

// Punto a lo largo de una polilínea según la fracción `s` de su largo total.
export function alongPolyline(pts, s) {
  const lens = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    lens.push(l);
    total += l;
  }
  let target = clamp01(s) * total;
  for (let i = 0; i < lens.length; i++) {
    if (target <= lens[i] || i === lens.length - 1) {
      const t = lens[i] > 0 ? Math.min(1, target / lens[i]) : 0;
      const a = pts[i];
      const b = pts[i + 1];
      return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), dx: b.x - a.x, dy: b.y - a.y };
    }
    target -= lens[i];
  }
  const last = pts[pts.length - 1];
  return { x: last.x, y: last.y, dx: 0, dy: 1 };
}

// Mezcla de colores hex (#rrggbb).
export function mixColor(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const k = clamp01(t);
  const ch = (shift) => Math.round(lerp((pa >> shift) & 255, (pb >> shift) & 255, k));
  return `#${[ch(16), ch(8), ch(0)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
