import { clamp01, ellipsePath, lerp, mixColor, smooth, smoothPath } from './shapes.js';
import { PALETTE as C } from './palette.js';

// Vista de frente: lo que la persona ve en el espejo. Cara de maniquí (mismo
// tono que el muñeco 3D), boca con dientes y lengua, nuez de Adán y, para la
// masticación, maseteros y una vista "rayos X" del chicle entre los molares.
//
// Coordenadas ≈ milímetros con la misma altura que la vista en corte (boca en
// y ≈ 56, nuez en y ≈ 113). Convención de espejo, igual que el muñeco 3D: el
// lado izquierdo de la persona queda a la izquierda de la pantalla (x < 0).

export const FRONT_VIEWBOX = { x: -92, y: -40, w: 184, h: 218 };

// Apertura de la boca en los incisivos (mm) por grado de mandíbula.
const MM_PER_DEG = 1.45;
// La nuez queda más abajo que en el corte para que el mentón no la tape de
// frente; sube 16 mm al tragar.
const LAR_REST = 128;
const LAR_Y = -16;

const q = (x, y, j = 0) => ({ x, y, j });

function rigOf(params) {
  const jaw = Math.max(0, params.jaw ?? 0);
  return {
    D: jaw * MM_PER_DEG,
    X: params.jawX ?? 0,
    L: LAR_Y * clamp01(params.hyo ?? 0),
  };
}

// La mandíbula baja (D) y se desplaza de lado (X) según el peso del punto.
const jawPt = (pt, rig) => ({ x: pt.x + rig.X * Math.min(1, pt.j), y: pt.y + rig.D * pt.j, c: pt.c });
const jawAll = (pts, rig) => pts.map((pt) => jawPt(pt, rig));

// Contorno simétrico a partir de la mitad derecha (de arriba al centro de abajo).
function mirrored(right) {
  const left = right.slice(1, -1).reverse().map((pt) => ({ ...pt, x: -pt.x }));
  return [...right, ...left];
}
const mirrorPts = (pts) => pts.map((pt) => ({ ...pt, x: -pt.x }));

// ---------------------------------------------------------------------------

const FACE_RIGHT = [
  q(0, -100), q(38, -95), q(60, -77), q(69.4, -52), q(71.6, -28), q(71, -6),
  q(68.6, 16, 0.05), q(65, 36, 0.14), q(60.6, 54, 0.28), q(56.6, 66, 0.4), q(49.8, 80, 0.6),
  q(39.2, 90.6, 0.8), q(24.8, 99.6, 0.96), q(11.2, 104, 1.04), q(0, 105, 1.08),
];
const CHEEK_IDX = [7, 8, 9]; // se abomban un poco con el masetero

const NECK = [
  q(-40, 60), q(40, 60), q(42.2, 110), q(44.4, 138), q(49, 154), q(64, 164.6), q(96, 177), q(98, 200),
  q(-98, 200), q(-96, 177), q(-64, 164.6), q(-49, 154), q(-44.4, 138), q(-42.2, 110),
];

const EAR_R = [q(69.4, -16), q(76.6, -19.4), q(81.8, -11), q(82.2, 4), q(79.8, 19), q(75.6, 30), q(71.2, 34.6), q(68.4, 30)];
const EAR_IN_R = [q(73.6, -10.6), q(77.8, -6), q(78, 6), q(75.2, 18.4)];

// Labios: borde superior del labio de arriba, línea de cierre y borde
// inferior del labio de abajo (de comisura a comisura).
const CW = 24.4;
const UPPER_TOP = [q(-CW, 55.2), q(-17, 51), q(-9, 48.2), q(-4.2, 47.4), q(0, 49.2), q(4.2, 47.4), q(9, 48.2), q(17, 51), q(CW, 55.2)];
const STOMION = [q(-16, 56.2), q(-8, 56.7), q(0, 56.9), q(8, 56.7), q(16, 56.2)];
const LOWER_BOTTOM = [q(-19, 60.6), q(-10, 64.6), q(0, 65.8), q(10, 64.6), q(19, 60.6)];

// Dientes de adelante (centro, ancho, borde incisal, raíz visible).
const UPPER_TEETH = [
  [-4.3, 8.4, 57.9], [4.3, 8.4, 57.9], [-12.2, 6.8, 57.1], [12.2, 6.8, 57.1], [-18.6, 6.2, 57.4], [18.6, 6.2, 57.4],
];
const LOWER_TEETH = [
  [-2.8, 5.4, 55.6], [2.8, 5.4, 55.6], [-8.2, 5.6, 55.4], [8.2, 5.6, 55.4], [-13.8, 5.8, 55.2], [13.8, 5.8, 55.2],
];

function toothPath(cx, w, edge, dir, len) {
  // dir = 1: diente superior (borde abajo); -1: inferior (borde arriba).
  const h = w / 2;
  const top = edge - dir * len;
  return smoothPath([
    { x: cx - h * 0.92, y: top, c: 1 }, { x: cx + h * 0.92, y: top, c: 1 },
    { x: cx + h, y: edge - dir * len * 0.5 }, { x: cx + h * 0.8, y: edge - dir * 0.6 },
    { x: cx, y: edge + dir * 0.15 }, { x: cx - h * 0.8, y: edge - dir * 0.6 }, { x: cx - h, y: edge - dir * len * 0.5 },
  ], true, 0.8);
}

// ---------------------------------------------------------------------------

function mouthGeometry(params, rig) {
  const { X } = rig;
  // Los labios siguen sellados con la mandíbula apenas separada (y del todo
  // con `lipSeal`, al masticar con la boca cerrada).
  const D = Math.max(0, rig.D - 2.6 - 14 * clamp01(params.lipSeal ?? 0));
  const out = clamp01(params.tOut ?? 0);
  // Comisuras: bajan un poco y se acercan al abrir.
  const cy = 55.2 + 0.32 * D;
  const cx = CW - 0.07 * D;
  const shiftC = X * 0.5;
  const wOf = (x) => 1 - (Math.abs(x) / CW) ** 2;
  // Borde inferior del labio superior: sube apenas al abrir; con la lengua
  // afuera se apoya sobre ella.
  const upperLow = STOMION.map((pt) => ({ x: pt.x * (cx / CW), y: pt.y - (0.18 * D + out * 2.6) * wOf(pt.x) }));
  // Borde superior del labio inferior: baja más que los dientes (se separan).
  const lowerHigh = STOMION.map((pt) => ({
    x: pt.x * (cx / CW) + X * 0.85,
    y: pt.y + 1.15 * D * (0.25 + 0.75 * wOf(pt.x)),
  }));
  const lowerLow = LOWER_BOTTOM.map((pt) => ({ x: pt.x + X * 0.9, y: pt.y + 1.0 * D * (0.35 + 0.65 * wOf(pt.x)) }));
  const L = { x: -cx + shiftC, y: cy };
  const R = { x: cx + shiftC, y: cy };
  const top = UPPER_TOP.map((pt, i) => (i === 0 ? L : i === UPPER_TOP.length - 1 ? R : { x: pt.x, y: pt.y }));
  L.c = 1;
  R.c = 1;
  return {
    upperLip: [...top, ...upperLow.slice().reverse()],
    lowerLip: [L, ...lowerHigh, R, ...lowerLow.slice().reverse()],
    opening: [L, ...upperLow, R, ...lowerHigh.slice().reverse()],
    lowerLipTopY: lowerHigh[2].y,
  };
}

function tongueInside(params, rig) {
  // Lengua vista por la boca abierta: en reposo se ve el dorso detrás de los
  // dientes de abajo; al subir contra el paladar se ve su cara inferior, con
  // el frenillo, y a los lados el piso de la boca.
  const k = smooth(params.tPress ?? 0);
  const { D, X } = rig;
  const sx = X * 0.6;
  const w = 20.5;
  const restTop = 55.4 + D - 3.4;
  const topY = lerp(restTop, 40, k);
  const deep = 60 + D * 1.3 + 30;
  // Borde inferior: en reposo fuera de la vista; arriba, la cara inferior
  // baja por el centro hasta el piso y deja ver los recesos a los lados.
  const sideY = lerp(deep, 56.6 + 0.3 * D, k);
  const midY = lerp(deep, 61 + 0.95 * D, k);
  const pts = [
    { x: -w + sx, y: sideY }, { x: -w * 0.98 + sx, y: Math.min(sideY, topY + 6) },
    { x: -w * 0.66 + sx, y: topY + 1.2 }, { x: -w * 0.28 + sx, y: topY }, { x: sx, y: topY + 0.9 },
    { x: w * 0.28 + sx, y: topY }, { x: w * 0.66 + sx, y: topY + 1.2 }, { x: w * 0.98 + sx, y: Math.min(sideY, topY + 6) },
    { x: w + sx, y: sideY }, { x: w * 0.62 + sx, y: lerp(sideY, midY, 0.72) },
    { x: sx, y: midY }, { x: -w * 0.62 + sx, y: lerp(sideY, midY, 0.72) },
  ];
  const floorY = 64 + D * 1.05;
  const fren = smoothPath([{ x: sx, y: midY + 4 }, { x: sx + 0.2, y: lerp(midY, sideY, 0.5) }, { x: sx, y: sideY - 3 }], false);
  const veins = smoothPath([{ x: sx - 4, y: midY - 2 }, { x: sx - 7, y: lerp(midY, sideY, 0.55) }, { x: sx - 8.4, y: sideY - 4 }], false)
    + smoothPath([{ x: sx + 4, y: midY - 2 }, { x: sx + 7, y: lerp(midY, sideY, 0.55) }, { x: sx + 8.4, y: sideY - 4 }], false);
  const groove = smoothPath([{ x: sx, y: topY + 2.2 }, { x: sx, y: topY + 9 }], false);
  return {
    d: smoothPath(pts, true, 0.95),
    fill: mixColor(C.tongue, C.tongueUnder, k),
    fren,
    veins,
    groove,
    k,
    floor: smoothPath([
      { x: -26 + sx, y: floorY + 14 }, { x: -24 + sx, y: floorY - 6 }, { x: sx, y: floorY - 9 },
      { x: 24 + sx, y: floorY - 6 }, { x: 26 + sx, y: floorY + 14 },
    ], true),
  };
}

function tongueOutShape(params, rig) {
  // Masako: punta de la lengua entre los dientes, por sobre el labio inferior.
  const k = smooth(params.tOut ?? 0);
  if (k < 0.01) return { d: '', opacity: 0 };
  const top = 57.4;
  const len = lerp(2, 12.6, k) + rig.D * 0.2;
  const w = lerp(9, 13.6, k);
  const sx = rig.X * 0.7;
  const pts = [
    { x: -w + sx, y: top - 1 }, { x: w + sx, y: top - 1 }, { x: w * 1.02 + sx, y: top + len * 0.45 },
    { x: w * 0.72 + sx, y: top + len * 0.9 }, { x: sx, y: top + len * 1.04 }, { x: -w * 0.72 + sx, y: top + len * 0.9 },
    { x: -w * 1.02 + sx, y: top + len * 0.45 },
  ];
  return {
    d: smoothPath(pts, true, 1),
    groove: smoothPath([{ x: sx, y: top + 1 }, { x: sx + 0.2, y: top + len * 0.62 }], false),
    hi: ellipsePath(sx - w * 0.3, top + len * 0.42, w * 0.32, len * 0.18, -0.2),
    opacity: clamp01(k * 1.6),
  };
}

function adamsApple(rig, params) {
  const y = LAR_REST + rig.L;
  const shadow = smoothPath([
    { x: -6.4, y: y - 2.6 }, { x: 0, y: y - 4.4 }, { x: 6.4, y: y - 2.6 }, { x: 3.2, y: y + 3.6 },
    { x: 0, y: y + 7.2 }, { x: -3.2, y: y + 3.6 },
  ], true, 0.9);
  const hi = smoothPath([
    { x: -4.6, y: y - 2.8 }, { x: 0, y: y - 4 }, { x: 4.6, y: y - 2.8 }, { x: 0, y: y + 3.6 },
  ], true, 0.9);
  const cric = ellipsePath(0, y + 16, 5.2, 2.2, 0);
  const effort = clamp01(params.supraEffort ?? 0);
  return { shadow, hi, cric, effort };
}

// Mano derecha apoyada en el cuello: yemas del índice y el medio junto a la
// nuez (la persona siente cómo sube). La mano entra desde abajo a la derecha.
function capsule(a, b, r0, r1) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const ux = dx / len;
  const uy = dy / len;
  return smoothPath([
    { x: a.x - ux * r0, y: a.y - uy * r0 },
    { x: a.x + nx * r0 - ux * r0 * 0.35, y: a.y + ny * r0 - uy * r0 * 0.35 },
    { x: b.x + nx * r1, y: b.y + ny * r1, c: 1 },
    { x: b.x - nx * r1, y: b.y - ny * r1, c: 1 },
    { x: a.x - nx * r0 - ux * r0 * 0.35, y: a.y - ny * r0 - uy * r0 * 0.35 },
  ], true, 1);
}

function fingers(params, rig) {
  const k = clamp01(params.hand ?? 0);
  if (k < 0.01) return { d: '', opacity: 0, back: '' };
  // Los dedos acompañan un poco a la laringe (la piel se desliza bajo ellos).
  const dy = rig.L * 0.35;
  const P = (x, y) => ({ x, y: y + dy });
  const d = capsule(P(5.4, 124), P(60, 129), 5.4, 5.8)
    + capsule(P(6.6, 136), P(62, 140), 5.7, 6)
    + capsule(P(16, 147), P(62, 150.4), 5.2, 5.6)
    + capsule(P(26, 156.6), P(60, 159.6), 4.5, 5);
  const back = smoothPath([
    P(54, 121.4), P(70, 119.4), P(90, 125), P(100, 147), P(92, 169), P(70, 167), P(54, 163), P(50, 143),
  ], true, 0.9);
  const knuckles = smoothPath([P(56.4, 128), P(57.6, 139.6), P(57.4, 150.6), P(55.8, 159.4)], false);
  return { d, back, knuckles, opacity: k };
}

function liftArrow(params, rig) {
  const k = clamp01(params.arrow ?? 0);
  if (k < 0.01) return { d: '', opacity: 0 };
  const x = -19;
  const y0 = LAR_REST + 14 + rig.L * 0.55;
  const y1 = y0 - 20;
  return { d: `M${x} ${y0}L${x} ${y1}M${x - 4} ${y1 + 4.8}L${x} ${y1}L${x + 4} ${y1 + 4.8}`, opacity: k };
}

// Masticación: maseteros (rayos X) y chicle entre los molares.
const MASSETER_R = [q(50.6, 6.6), q(62.4, 8.4), q(61.4, 38, 0.2), q(57.2, 60, 0.4), q(48.4, 64.6, 0.48), q(45.4, 38, 0.2)];
function masseter(params, rig, side) {
  const act = clamp01(side < 0 ? params.masL ?? 0 : params.masR ?? 0);
  const base = side < 0 ? mirrorPts(MASSETER_R) : MASSETER_R;
  const pts = jawAll(base, rig).map((pt, i) => (i === 2 || i === 5 ? { ...pt, x: pt.x + side * 1.6 * act } : pt));
  return { d: smoothPath(pts, true, 0.9), act };
}

function molarPath(cx, w, edge, dir) {
  // Corona de molar vista de frente: dos cúspides hacia el diente opuesto.
  const h = w / 2;
  const base = edge - dir * 6.4;
  return smoothPath([
    { x: cx - h * 0.86, y: base, c: 1 }, { x: cx + h * 0.86, y: base, c: 1 }, { x: cx + h, y: edge - dir * 2.4 },
    { x: cx + h * 0.5, y: edge }, { x: cx, y: edge - dir * 0.9 }, { x: cx - h * 0.5, y: edge }, { x: cx - h, y: edge - dir * 2.4 },
  ], true, 0.9);
}

function molars(rig, side) {
  // Dos molares arriba (fijos) y dos abajo (siguen a la mandíbula).
  const up = [];
  const low = [];
  const Dm = rig.D * 0.55;
  [[28.6, 8], [37.8, 8.6]].forEach(([cx, w]) => {
    up.push(molarPath(side * cx, w, 54.6, 1));
    low.push(molarPath(side * cx + rig.X * 0.9, w, 57 + Dm, -1));
  });
  return { up: up.join(''), low: low.join('') };
}

function gum(params, rig) {
  const a = clamp01(params.xray ?? 0);
  if (a < 0.01) return { d: '', opacity: 0 };
  const g = Math.max(-1, Math.min(1, params.gum ?? 0));
  const across = 1 - Math.abs(g);
  const x = g * 33.6 + rig.X * 0.5;
  // Entre los molares se aplasta al cerrar; al cruzar de lado pasa por detrás
  // de los dientes de adelante (la lleva la lengua).
  const gap = 1.8 + rig.D * 0.55;
  const y = 55.7 + rig.D * 0.27 - across * 6;
  const rx = 5.4 + 1.6 * (1 - Math.min(1, gap / 6)) * (1 - across);
  const ry = lerp(Math.max(1.4, gap / 2 + 0.3), 3.4, across);
  // Al cruzar por detrás de los labios se ve en transparencia (rayos X).
  return { d: ellipsePath(x, y, rx, ry, 0), opacity: a * (1 - 0.45 * smooth(across * 1.6)) };
}

// ---------------------------------------------------------------------------

export const FRONT_LAYERS = [
  { id: 'neck', style: { fill: 'url(#neckGrad)', stroke: C.faceEdge, strokeWidth: 0.8 } },
  { id: 'neckLines', style: { fill: 'none', stroke: C.faceShade, strokeWidth: 1.4, opacity: 0.8, strokeLinecap: 'round' } },
  { id: 'jawShadow', style: { fill: C.faceEdge, opacity: 0.3, filter: 'url(#soft)' } },
  { id: 'adamShadow', style: { fill: '#A89F8C', filter: 'url(#blur1)' } },
  { id: 'adamHi', style: { fill: '#E6DFD0', opacity: 0.4 } },
  { id: 'adamEffort', style: { fill: 'none', stroke: C.blaze, strokeWidth: 1.4, filter: 'url(#glow)' } },
  { id: 'cricoid', style: { fill: C.faceShade, opacity: 0.6 } },
  { id: 'ears', style: { fill: C.faceShade, stroke: C.faceEdge, strokeWidth: 0.8 } },
  { id: 'earIn', style: { fill: 'none', stroke: C.faceEdge, strokeWidth: 0.9, opacity: 0.7, strokeLinecap: 'round' } },
  { id: 'face', style: { fill: 'url(#faceGrad)', stroke: C.faceEdge, strokeWidth: 0.9 } },
  { id: 'faceShade', style: { fill: 'none', stroke: C.faceShade, strokeWidth: 1.2, strokeLinecap: 'round', opacity: 0.9 } },
  { id: 'masL', style: { stroke: C.blaze, strokeWidth: 0.6, strokeDasharray: '1.6 1.2' } },
  { id: 'masR', style: { stroke: C.blaze, strokeWidth: 0.6, strokeDasharray: '1.6 1.2' } },
  { id: 'xrayWin', style: { fill: 'url(#xrayGrad)' } },
  { id: 'molarsUp', style: { fill: C.tooth, fillOpacity: 0.85, stroke: C.toothEdge, strokeWidth: 0.4 } },
  { id: 'molarsLow', style: { fill: C.tooth, fillOpacity: 0.85, stroke: C.toothEdge, strokeWidth: 0.4 } },
  { id: 'brows', style: { fill: 'none', stroke: C.faceEdge, strokeWidth: 2.2, strokeLinecap: 'round', opacity: 0.55 } },
  { id: 'lids', style: { fill: C.faceShade, opacity: 0.5 } },
  { id: 'eyes', style: { fill: 'none', stroke: '#6E6656', strokeWidth: 1.2, strokeLinecap: 'round' } },
  { id: 'nose', style: { fill: 'none', stroke: C.faceEdge, strokeWidth: 1.1, strokeLinecap: 'round', strokeLinejoin: 'round' } },
  { id: 'nostrils', style: { fill: '#7E7464', opacity: 0.75 } },
  { id: 'cavity', style: { fill: C.mouth }, clip: 'mouth' },
  { id: 'floor', style: { fill: '#6B2E27' }, clip: 'mouth' },
  { id: 'tongueIn', style: { stroke: C.tongueEdge, strokeWidth: 0.5 }, clip: 'mouth' },
  { id: 'tongueGroove', style: { fill: 'none', stroke: C.tongueLow, strokeWidth: 0.9, strokeLinecap: 'round' }, clip: 'mouth' },
  { id: 'fren', style: { fill: 'none', stroke: '#B85E55', strokeWidth: 1, strokeLinecap: 'round' }, clip: 'mouth' },
  { id: 'veins', style: { fill: 'none', stroke: '#7D6FA0', strokeWidth: 0.9, strokeLinecap: 'round', opacity: 0.8 }, clip: 'mouth' },
  { id: 'tongueEffort', style: { fill: C.blaze }, clip: 'mouth' },
  { id: 'lowerTeeth', style: { fill: C.tooth, stroke: C.toothEdge, strokeWidth: 0.4 }, clip: 'mouth' },
  { id: 'upperGum', style: { fill: '#B8686A' }, clip: 'mouth' },
  { id: 'upperTeeth', style: { fill: C.tooth, stroke: C.toothEdge, strokeWidth: 0.4 }, clip: 'mouth' },
  { id: 'lowerLip', style: { fill: C.lipFront, stroke: C.faceEdge, strokeWidth: 0.6 } },
  { id: 'tongueOut', style: { fill: C.tongueHi, stroke: C.tongueEdge, strokeWidth: 0.6 } },
  { id: 'tongueOutHi', style: { fill: '#E0937D', opacity: 0.55 } },
  { id: 'tongueOutGroove', style: { fill: 'none', stroke: C.tongueLow, strokeWidth: 0.9, strokeLinecap: 'round' } },
  { id: 'upperLip', style: { fill: C.lipFront, stroke: C.faceEdge, strokeWidth: 0.6 } },
  { id: 'gum', style: { fill: C.gum, stroke: C.gumEdge, strokeWidth: 0.6 } },
  { id: 'mouthLine', style: { fill: 'none', stroke: '#7A5A50', strokeWidth: 0.9, strokeLinecap: 'round' } },
  { id: 'hand', style: { fill: C.hand, stroke: C.handEdge, strokeWidth: 0.7 } },
  { id: 'handBack', style: { fill: C.hand, stroke: C.handEdge, strokeWidth: 0.7 } },
  { id: 'knuckles', style: { fill: 'none', stroke: C.faceShade, strokeWidth: 1, strokeLinecap: 'round' } },
  { id: 'arrow', style: { fill: 'none', stroke: C.work, strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' } },
];

// Recortes: el interior de la boca solo se ve por la abertura entre los labios.
export const FRONT_CLIPS = ['mouth'];

const STATIC = {
  neck: smoothPath(NECK, true, 0.8),
  neckLines: smoothPath([q(-52, 62), q(-34, 116), q(-12, 160)], false) + smoothPath([q(52, 62), q(34, 116), q(12, 160)], false)
    + smoothPath([q(-30, 166), q(-14, 170), q(-6, 166)], false) + smoothPath([q(30, 166), q(14, 170), q(6, 166)], false),
  ears: smoothPath(EAR_R, true) + smoothPath(mirrorPts(EAR_R), true),
  earIn: smoothPath(EAR_IN_R, false) + smoothPath(mirrorPts(EAR_IN_R), false),
  brows: smoothPath([q(15.6, -27.6), q(29, -32), q(44, -29.4)], false) + smoothPath([q(-15.6, -27.6), q(-29, -32), q(-44, -29.4)], false),
  lids: ellipsePath(31, -14.4, 13.6, 6.4, 0.04) + ellipsePath(-31, -14.4, 13.6, 6.4, -0.04),
  nose: smoothPath([q(-15.6, 19.6), q(-13.8, 26.4), q(-8, 29.8), q(-3.2, 28.6), q(0, 30), q(3.2, 28.6), q(8, 29.8), q(13.8, 26.4), q(15.6, 19.6)], false)
    + smoothPath([q(-7.6, -21), q(-9, -2), q(-11.4, 13)], false) + smoothPath([q(7.6, -21), q(9, -2), q(11.4, 13)], false),
  nostrils: ellipsePath(-6.6, 27.2, 3.1, 1.4, 0.18) + ellipsePath(6.6, 27.2, 3.1, 1.4, -0.18),
  upperGum: smoothPath([q(-26, 40), q(26, 40), q(26, 47.6), q(18.6, 46.2), q(12.2, 46.8), q(4.3, 46.2), q(0, 47.2), q(-4.3, 46.2), q(-12.2, 46.8), q(-18.6, 46.2), q(-26, 47.6)], true, 0.6),
  upperTeeth: UPPER_TEETH.map(([cx, w, e]) => toothPath(cx, w, e, 1, 12)).join(''),
};

function eyes(params) {
  // Ojos cerrados (expresión tranquila); parpadeo no aplica. Con esfuerzo se
  // aprietan un poco.
  const sq = clamp01(params.squint ?? 0) * 1.2;
  return smoothPath([q(19.6, -12.6), q(31, -9.4 + sq), q(42.6, -12.8)], false)
    + smoothPath([q(-19.6, -12.6), q(-31, -9.4 + sq), q(-42.6, -12.8)], false);
}

export function frontAnchors(params) {
  const rig = rigOf(params);
  return {
    larynx: { x: 0, y: LAR_REST + rig.L },
    lips: { x: 0, y: 56 },
    tongue: { x: 0, y: 60 },
    masL: { x: -60, y: 36 },
    masR: { x: 60, y: 36 },
  };
}

export function computeFront(params) {
  const rig = rigOf(params);
  const out = {};
  for (const id of Object.keys(STATIC)) out[id] = { d: STATIC[id] };

  const masL = masseter(params, rig, -1);
  const masR = masseter(params, rig, 1);
  // Contorno de la cara; las mejillas se abomban sobre el masetero que trabaja.
  const n = FACE_RIGHT.length;
  const face = mirrored(FACE_RIGHT).map((pt, i) => {
    const s = jawPt(pt, rig);
    const ri = i < n ? i : 2 * n - 2 - i;
    if (CHEEK_IDX.includes(ri)) s.x += Math.sign(pt.x) * 1.3 * (pt.x > 0 ? masR.act : masL.act);
    return s;
  });
  out.face = { d: smoothPath(face, true, 0.95) };

  // Sombras de la cara: pliegues nasolabiales y surco del mentón.
  const chin = jawAll([q(-11, 74, 1), q(0, 75.6, 1), q(11, 74, 1)], rig);
  out.faceShade = {
    d: smoothPath(jawAll([q(17.6, 29), q(23.6, 41, 0.15), q(27.6, 52, 0.35)], rig), false)
      + smoothPath(jawAll([q(-17.6, 29), q(-23.6, 41, 0.15), q(-27.6, 52, 0.35)], rig), false)
      + smoothPath(chin, false)
      + smoothPath([q(-3.4, 32), q(-4.2, 46.6)], false) + smoothPath([q(3.4, 32), q(4.2, 46.6)], false),
  };
  out.jawShadow = { d: smoothPath(jawAll([q(-38, 89, 0.8), q(0, 102.6, 1.05), q(38, 89, 0.8), q(28, 108, 0.6), q(0, 114, 0.7), q(-28, 108, 0.6)], rig), true) };

  const adam = adamsApple(rig, params);
  out.adamShadow = { d: adam.shadow };
  out.adamHi = { d: adam.hi };
  out.adamEffort = { d: adam.shadow, opacity: adam.effort };
  out.cricoid = { d: adam.cric };

  // Maseteros: casi invisibles en reposo; al masticar se marcan y se tiñen.
  const xray = clamp01(params.xray ?? 0);
  out.masL = { d: masL.d, fill: mixColor(C.muscle, C.blaze, masL.act), opacity: xray * (0.08 + 0.55 * masL.act) };
  out.masR = { d: masR.d, fill: mixColor(C.muscle, C.blaze, masR.act), opacity: xray * (0.08 + 0.55 * masR.act) };
  const mL = molars(rig, -1);
  const mR = molars(rig, 1);
  out.xrayWin = { d: ellipsePath(-34, 56.4, 15.6, 12.6, 0) + ellipsePath(34, 56.4, 15.6, 12.6, 0), opacity: xray };
  out.molarsUp = { d: mL.up + mR.up, opacity: xray };
  out.molarsLow = { d: mL.low + mR.low, opacity: xray };
  const g = gum(params, rig);
  out.gum = { d: g.d, opacity: g.opacity };

  out.eyes = { d: eyes(params) };

  // Boca.
  const m = mouthGeometry(params, rig);
  out.clip_mouth = { d: smoothPath(m.opening, true, 0.9) };
  out.cavity = { d: smoothPath([q(-40, 40), q(40, 40), q(40, 110), q(-40, 110)], true, 0) };
  const ti = tongueInside(params, rig);
  out.floor = { d: ti.floor, opacity: ti.k };
  out.tongueIn = { d: ti.d, fill: ti.fill };
  out.tongueGroove = { d: ti.groove, opacity: 1 - ti.k };
  out.fren = { d: ti.fren, opacity: ti.k };
  out.veins = { d: ti.veins, opacity: ti.k * 0.8 };
  out.tongueEffort = { d: ti.d, opacity: clamp01(params.tongueEffort ?? 0) * 0.5 };
  out.lowerTeeth = {
    d: LOWER_TEETH.map(([cx, w, e]) => toothPath(cx + rig.X * 0.9, w, e + rig.D, -1, 10)).join(''),
  };
  out.upperLip = { d: smoothPath(m.upperLip, true, 0.9) };
  out.lowerLip = { d: smoothPath(m.lowerLip, true, 0.9) };
  const opening = m.opening;
  out.mouthLine = { d: smoothPath(opening.slice(0, 7), false), opacity: 1 - clamp01(rig.D / 3 + (params.tOut ?? 0) * 2) };

  const to = tongueOutShape(params, rig);
  out.tongueOut = { d: to.d, opacity: to.opacity };
  out.tongueOutHi = { d: to.hi ?? '', opacity: to.opacity * 0.55 };
  out.tongueOutGroove = { d: to.groove ?? '', opacity: to.opacity };

  const h = fingers(params, rig);
  out.hand = { d: h.d, opacity: h.opacity };
  out.handBack = { d: h.back, opacity: h.opacity };
  out.knuckles = { d: h.knuckles ?? '', opacity: h.opacity * 0.8 };
  const ar = liftArrow(params, rig);
  out.arrow = { d: ar.d, opacity: ar.opacity };
  return out;
}
