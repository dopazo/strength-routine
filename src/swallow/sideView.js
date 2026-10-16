import {
  alongPolyline, bump, clamp01, ellipsePath, lerp, mixColor, rotateAbout, smooth, smoothPath,
} from './shapes.js';
import { PALETTE as C } from './palette.js';

// Vista lateral en corte (plano sagital medio) de cabeza y cuello, como las
// láminas de fonoaudiología: deja ver lengua, paladar, velo, epiglotis,
// hioides y laringe, que es donde ocurre la deglución.
//
// Coordenadas ≈ milímetros, x hacia adelante (la cara mira a la derecha) e y
// hacia abajo (SVG). Origen en el conducto auditivo; el paladar duro queda a
// y ≈ 30 y las cuerdas vocales a y ≈ 123.
//
// Cada punto lleva pesos de "skinning" (igual que la malla del muñeco 3D):
//   j — sigue el giro de la mandíbula (articulación temporomandibular)
//   h — sigue al hioides cuando sube
//   l — sigue a la laringe cuando sube
// Además, algunas formas tienen "morph targets" (formas objetivo) que se
// mezclan según los parámetros de la pose (ver headPoses.js). Un target puede
// anclar puntos (`a`): esos puntos dejan de seguir a la mandíbula mientras la
// forma está activa (p. ej. la lengua pegada al paladar con la boca abierta).

export const SIDE_VIEWBOX = { x: -46, y: -24, w: 174, h: 206 };

const PIVOT = { x: 10, y: 6 };          // cóndilo (ATM)
const HYO_VEC = { x: 9, y: -15 };       // desplazamiento del hioides al tragar
const LAR_VEC = { x: 6, y: -23 };       // la laringe sube más y se acerca al hioides

const p = (x, y, j = 0, h = 0, l = 0, c = 0) => ({ x, y, j, h, l, c });

// ---------------------------------------------------------------------------
// Rig: mandíbula + hioides + laringe.

function rigOf(params) {
  const jawDeg = params.jaw ?? 0;
  const e = clamp01(params.hyo ?? 0);
  return {
    a: (jawDeg * Math.PI) / 180,
    // Al abrir mucho, el cóndilo además se desliza hacia adelante.
    jx: 0.16 * Math.max(0, jawDeg),
    H: { x: HYO_VEC.x * e, y: HYO_VEC.y * e },
    L: { x: LAR_VEC.x * e, y: LAR_VEC.y * e },
  };
}

function skinPoint(pt, rig, jScale = 1) {
  let { x, y } = pt;
  const j = (pt.j ?? 0) * jScale;
  if (j > 0 && (rig.a !== 0 || rig.jx !== 0)) {
    const r = rotateAbout(x, y, PIVOT.x, PIVOT.y, rig.a);
    x += (r.x + rig.jx - x) * j;
    y += (r.y - y) * j;
  }
  if (pt.h) { x += rig.H.x * pt.h; y += rig.H.y * pt.h; }
  if (pt.l) { x += rig.L.x * pt.l; y += rig.L.y * pt.l; }
  return { x, y, c: pt.c };
}

const skinAll = (pts, rig) => pts.map((pt) => skinPoint(pt, rig));

// Mezcla de formas: `targets` = { param: { pts: [{x, y} | null], a?: [..] } }
// o en forma dispersa { param: { at: { índice: [x, y, ancla] } } }.
function morph(rest, targets, params, rig) {
  return rest.map((r, i) => {
    let x = r.x;
    let y = r.y;
    let anchor = 0;
    for (const key in targets) {
      const w = params[key] ?? 0;
      if (!w) continue;
      const t = targets[key];
      let tx;
      let ty;
      let ta = 0;
      if (t.pts) {
        const q = t.pts[i];
        if (!q) continue;
        tx = q[0];
        ty = q[1];
        ta = t.a ? t.a[i] : 0;
      } else {
        const q = t.at[i];
        if (!q) continue;
        [tx, ty, ta = 0] = q;
      }
      x += (tx - r.x) * w;
      y += (ty - r.y) * w;
      anchor += ta * w;
    }
    return skinPoint({ ...r, x, y }, rig, 1 - clamp01(anchor));
  });
}

// ---------------------------------------------------------------------------
// Geometría en reposo (mandíbula cerrada, laringe abajo).

// Silueta de la piel: frente, perfil, mentón, cuello y nuca.
const SKIN = [
  p(66, -95), p(86, -72), p(94, -50), p(99, -34), p(97.5, -27.5), p(95.6, -23),
  p(98.5, -14), p(104, -2), p(111, 8.5), p(117.5, 15.5), p(118, 20.5), p(114, 24.5),
  p(107, 28), p(101.2, 31.5, 0, 0, 0, 1),
  p(101, 37), p(103.6, 45.5), p(102.2, 52), p(99.2, 55.4),          // 14-17 labio superior
  p(99.2, 57, 0.7), p(102.4, 61, 1), p(102.2, 66, 1), p(98.4, 73, 1), // 18-21 labio inferior
  p(94.2, 78, 1),
  p(96.6, 86.5, 1), p(96.4, 95.5, 1), p(91, 103.5, 1), p(80.5, 109.5, 1),
  p(68, 110.8, 0.8, 0.15), p(57.5, 109.6, 0.4, 0.45), p(51.4, 107.4, 0.12, 0.55, 0.25),
  p(49, 109.6, 0, 0.2, 0.75), p(50.4, 113.2, 0, 0, 1), p(49.2, 118.5, 0, 0, 1),
  p(46.6, 128, 0, 0, 0.8), p(44.9, 145, 0, 0, 0.4), p(43.9, 170, 0, 0, 0.1), p(43.5, 205),
  p(-60, 205), p(-60.5, 160), p(-63, 118), p(-67, 82), p(-75, 52), p(-87, 26), p(-96, 0),
  p(-100, -30), p(-98, -58), p(-88, -82), p(-60, -100), p(5, -108),
];
// Con la lengua afuera (Masako) los labios se apoyan sobre ella.
const LIP_OUT_SKIN = { tOut: { at: { 17: [100.4, 58, 1], 18: [100.6, 66.4, 1], 19: [102.6, 68.4, 0.6] } } };

// Aire: fosas nasales → rinofaringe → boca → orofaringe → hipofaringe →
// laringe → tráquea. Su borde frontal pasa por dentro de lengua, dientes y
// labios (que se dibujan encima); así basta que se muevan esos órganos para
// que aparezca o desaparezca el aire entre ellos. La pared faríngea posterior
// (índices AIR_WALL) avanza con `phx`.
const AIR_WALL_FIRST = 9;
const AIR_WALL_LAST = 16;
const AIR = [
  p(100.4, 24.6), p(97.4, 14), p(90, 2), p(79, -8), p(62, -13.4), p(46, -12.6), p(36, -6),
  p(27.6, 2.4), p(17, 6.6),
  p(9, 13.6), p(5.4, 25), p(4.7, 40), p(4.6, 55), p(5, 70), p(5.6, 85), p(6.1, 99),
  p(6.8, 108, 0, 0, 0.35),
  p(7.8, 113.5, 0, 0, 0.65), p(12.4, 112.2, 0, 0, 1), p(15.8, 107.4, 0, 0, 1, 1), p(20.4, 108, 0, 0, 1),
  p(21.6, 114, 0, 0, 1), p(21.4, 119.6, 0, 0, 1), p(21, 123.6, 0, 0, 1), p(20.6, 132, 0, 0, 1),
  p(20.3, 141, 0, 0, 0.95), p(19.5, 165, 0, 0, 0.55), p(18.5, 210, 0, 0, 0, 1),
  p(34.6, 210, 0, 0, 0, 1), p(34.8, 165, 0, 0, 0.55), p(34.7, 142, 0, 0, 0.95), p(35.4, 133, 0, 0, 1),
  p(35.6, 124, 0, 0, 1, 1), p(34.4, 118, 0, 0, 1), p(33.6, 112, 0, 0, 1), p(33.8, 104, 0, 0.15, 0.85),
  p(32.6, 97, 0, 0.6, 0.4),
  p(30, 84, 0.05, 0.35), p(46, 70, 0.45, 0.1), p(63.4, 80.4, 0.85, 0.1), p(71.6, 72.6, 1),
  p(75.8, 66.2, 1), p(79.2, 62.4, 1), p(84.6, 56.6, 1), p(90, 59.4, 1), p(96, 58.2, 1),
  p(99.6, 56.8, 0.6), p(96, 55.8), p(89.8, 54), p(85, 48.6), p(76, 41.4), p(62, 35.4),
  p(48, 34.6), p(37, 36.6), p(37, 28.6), p(60, 27.6), p(88, 27),
];

// Cornetes nasales (tejido sobre el aire de las fosas).
const TURBINATES = [
  [p(70, -8.6), p(58, -11.4), p(46, -10.6), p(40, -7.6, 0, 0, 0, 1), p(48, -6), p(60, -6.4)],
  [p(83, 4.6), p(70, -1.6), p(53, -2.8), p(40, 0.6), p(35, 5.8, 0, 0, 0, 1), p(44, 8), p(60, 8.4), p(75, 8)],
  [p(89, 18.6), p(76, 12.2), p(56, 11.4), p(41, 14), p(34.4, 19.4, 0, 0, 0, 1), p(42, 22.6), p(60, 23.2), p(79, 22.8)],
];

// Velo de tejido sobre las fosas nasales: quedan como fondo y la atención va
// a la boca y la faringe.
const NASAL_VEIL = [
  p(100.8, 25.6), p(98, 14), p(90.6, 1.6), p(79.4, -8.6), p(62, -14.2), p(45.6, -13.4), p(35, -6.2),
  p(29, 4), p(31, 20), p(36, 27.8), p(60, 27), p(88, 26.4),
];

// Paladar duro y maxilar (hueso; tapa la raíz del incisivo).
const PALATE = [
  p(91.6, 27.8, 0, 0, 0, 1), p(89, 33), p(87.2, 40), p(86, 45.2, 0, 0, 0, 1), p(81.8, 46.8, 0, 0, 0, 1),
  p(78.4, 42.6), p(71, 37.6), p(61, 34.6), p(49, 33.8), p(40.5, 35), p(35.4, 33.6, 0, 0, 0, 1),
  p(37, 30.4), p(48, 29.6), p(64, 29.4), p(80, 28.8),
];

// Incisivo superior (fijo) e inferior (sigue a la mandíbula). Se dibujan
// antes que el hueso, que tapa las raíces.
const UPPER_INCISOR = [
  p(88.6, 57.8, 0, 0, 0, 1), p(88.1, 52.6), p(86.8, 46.4), p(84.4, 39.4), p(81.4, 33, 0, 0, 0, 1),
  p(79.6, 36.6), p(81.6, 46.8), p(83.8, 50.8), p(86.6, 55.6),
];
const LOWER_INCISOR = [
  p(85.6, 55.2, 1, 0, 0, 1), p(86.9, 58.8, 1), p(87, 64.8, 1), p(85, 72, 1), p(81.4, 80, 1, 0, 0, 1),
  p(79.6, 72.6, 1), p(80.4, 64.8, 1), p(82.6, 59, 1),
];

// Sínfisis mandibular (hueso del mentón cortado en la línea media).
const SYMPHYSIS = [
  p(86.9, 64.6, 1, 0, 0, 1), p(84.6, 72, 1), p(83.4, 78.6, 1), p(86.2, 89.6, 1), p(83.2, 98.4, 1),
  p(76, 101.6, 1), p(69.6, 99, 1), p(68.4, 90.4, 1), p(70.4, 80.6, 1), p(75.2, 70.4, 1),
  p(80.2, 64.8, 1, 0, 0, 1),
];

// Mandíbula completa (lateral, fuera del corte): fantasma para leer el
// movimiento de abrir y masticar.
const MANDIBLE_GHOST = [
  p(86.9, 64.6, 1), p(83.4, 78.6, 1), p(86.2, 89.6, 1), p(83.2, 98.4, 1), p(76, 101.6, 1), p(52, 95, 1),
  p(28, 84, 1), p(13, 75, 1, 0, 0, 1), p(8, 52, 1), p(7.6, 22, 1), p(9.6, 7.4, 1, 0, 0, 1),
  p(15.4, 9.6, 1), p(21, 20, 1), p(30.6, 10, 1, 0, 0, 1), p(33.4, 32, 1), p(40, 50, 1), p(60, 59, 1),
  p(80, 62.6, 1),
];

// Labios (músculo orbicular), un poco por dentro de la silueta.
const UPPER_LIP = [
  p(100.6, 37.4), p(103, 45.4), p(101.7, 51.8), p(98.9, 55, 0, 0, 0, 1), p(95, 55.1), p(91.6, 53.2),
  p(90, 47), p(90.4, 40.8), p(94.6, 37),
];
const LOWER_LIP = [
  p(98.9, 57.4, 1, 0, 0, 1), p(101.9, 61.1, 1), p(101.7, 66, 1), p(98, 72.6, 1), p(94.4, 77, 1),
  p(91, 77.4, 1), p(88.8, 71.2, 1), p(89.2, 63.2, 1), p(93, 58.2, 1),
];
const UPPER_LIP_T = { tOut: { at: { 3: [99.8, 57.6, 1], 4: [95.6, 57.4, 1], 5: [92, 56.4, 1] } } };
const LOWER_LIP_T = { tOut: { at: { 0: [99.8, 66.2, 1], 1: [102.4, 68.2, 0.7], 8: [93.4, 66.4, 1], 7: [89.4, 68.8, 0.6] } } };

// Velo del paladar (paladar blando) en reposo y elevado al tragar.
const VELUM = [
  p(36.4, 28.8), p(28.8, 31), p(21.8, 37.4), p(17.2, 45.4), p(15.4, 53.4), p(16.6, 58.6, 0, 0, 0, 1),
  p(20, 55), p(24, 48.6), p(29.6, 42.6), p(35.4, 36.8),
];
const VELUM_T = {
  velum: {
    pts: [[36.4, 28.8], [28, 25.6], [19, 23.8], [11, 24.6], [6.8, 28.8], [7.8, 34.8], [12.2, 36.6],
      [19, 35.6], [27, 35.8], [35.4, 36.8]],
  },
};

// Lengua (22 puntos): reposo + formas objetivo.
const TONGUE = [
  p(80, 60.4, 1),          // 0 punta
  p(77.6, 54, 0.95),       // 1
  p(72.4, 47, 0.85),       // 2 hoja
  p(64, 41.8, 0.74),       // 3 dorso
  p(54, 39.6, 0.64),       // 4
  p(44, 39.8, 0.55),       // 5
  p(35.6, 41.4, 0.47),     // 6
  p(28.6, 44.6, 0.4),      // 7
  p(22.8, 50.6, 0.32),     // 8 base (pared anterior de la orofaringe)
  p(20, 58.6, 0.26, 0.06),
  p(19.2, 67.4, 0.18, 0.15),
  p(20.4, 76.6, 0.1, 0.28),
  p(24, 85.4, 0.04, 0.48), // 12
  p(30, 93.4, 0, 0.72),    // 13 fondo de la valécula
  p(36.8, 95.6, 0, 0.95),  // 14 sobre el hioides
  p(46, 91.8, 0.15, 0.8),
  p(55.6, 88, 0.45, 0.45),
  p(63.8, 84.8, 0.8, 0.15),
  p(69.4, 82.6, 1),        // 18 inserción en el mentón
  p(72.6, 73.6, 1),        // 19 piso de boca / frenillo
  p(76.6, 66.6, 1),        // 20 cara inferior
  p(78.8, 62.6, 1),        // 21
];
const TONGUE_T = {
  // Fase oral: punta contra la papila, centro hundido sosteniendo el bolo y
  // dorso posterior sellando contra el velo.
  tCup: {
    pts: [[81, 50.6], [78.6, 45.8], [73, 44.6], [64, 46.4], [54, 46.8], [44, 43.6], [36.2, 40.2],
      [29.2, 43.4], [23, 50.6], null, null, null, null, null, null, null, null, null, null, null,
      [77.6, 63.6], [80, 58]],
    a: [1, 1, 0.9, 0.7, 0.6, 0.55, 0.5, 0.4, 0.3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.3, 0.5],
  },
  // Propulsión: aprieta el paladar de adelante hacia atrás y el dorso
  // posterior baja para dejar pasar el bolo.
  tSqueeze: {
    pts: [[81.4, 50.4], [78.6, 44.8], [72.6, 39], [64, 35.6], [54, 34.6], [44.6, 34.8], [37, 38],
      [30.4, 46.6], [25, 55.6], [21.6, 64.4], null, null, null, null, null, null, null, null, null, null,
      [77.8, 63.4], [80.2, 57.4]],
    a: [1, 1, 1, 1, 1, 1, 0.8, 0.5, 0.3, 0.1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.3, 0.5],
  },
  // Retracción de la base contra la pared faríngea (fase faríngea).
  tBack: {
    pts: [[81.4, 50.4], [78.6, 44.8], [72.6, 39], [64, 35.6], [54, 34.6], [44.6, 34.8], [37, 35.8],
      [29.6, 37.4], [19.6, 39.2], [12.8, 47.6], [9.8, 59], [10, 71], [13.6, 82], [21, 91], [30, 95.4],
      [42, 93.2], null, null, null, null, [77.8, 63.4], [80.2, 57.4]],
    a: [1, 1, 1, 1, 1, 1, 1, 0.9, 0.7, 0.5, 0.3, 0.15, 0, 0, 0, 0, 0, 0, 0, 0, 0.3, 0.5],
  },
  // Isométrico: toda la lengua empujando el paladar (boca abierta).
  tPress: {
    pts: [[81.6, 50.2], [78.8, 44.4], [72.6, 39], [64, 35.6], [54, 34.6], [44.6, 34.8], [37.2, 36.4],
      [31, 41.8], [25.4, 50], [21.6, 60], [20.4, 70.6], [22, 79.6], null, null, null, null, null, null,
      null, [77, 70], [79.6, 62], [81.4, 55.6]],
    a: [1, 1, 1, 1, 1, 1, 1, 0.85, 0.7, 0.45, 0.25, 0.1, 0, 0, 0, 0, 0, 0, 0, 0.2, 0.55, 0.85],
  },
  // Masako: lengua afuera, sostenida entre los dientes.
  tOut: {
    pts: [[102.8, 64.2], [102.6, 58.4], [96.4, 57.2], [89.4, 57.8], [80.6, 54.4], [66, 48.6], [52, 46.6],
      [40, 48.6], [30.4, 55.4], [25, 64.4], [22.8, 73.6], [23.8, 82], [27.2, 88.8], null, null, null,
      null, null, null, [79.6, 65.2], [88, 65.6], [97.4, 65.8]],
    a: [1, 1, 1, 1, 0.8, 0.6, 0.45, 0.35, 0.25, 0.15, 0.05, 0, 0, 0, 0, 0, 0, 0, 0, 0.9, 1, 1],
  },
};

// Epiglotis: erguida en reposo; al tragar se pliega sobre la entrada de la
// laringe. Ambas formas en el marco de la laringe (antes de subirla).
const EPI_REST = [
  [32.6, 111], [27, 103.8], [22, 96.6], [18.4, 90], [15.6, 83.6], [14.6, 78.6],
  [16.8, 77], [19.6, 82.4], [23, 88.6], [26.4, 95], [30.6, 102.4], [34.8, 110.4],
];
const EPI_FOLD = [
  [32.6, 111], [29.2, 105.8], [25.4, 103.2], [20.6, 103.8], [16.4, 106.4], [13.2, 109.8],
  [14.2, 106.4], [18, 101.6], [22.8, 98.6], [27.8, 98.8], [31.8, 103], [34.8, 110.4],
];
// Peso de cada punto respecto de la laringe: erguida, la punta queda algo
// rezagada (la empuja la base de la lengua); plegada, va entera con la laringe.
const EPI_L = [1, 0.95, 0.85, 0.75, 0.7, 0.7, 0.7, 0.72, 0.8, 0.88, 0.95, 1];

// Tejido pre-epiglótico (bajo la valécula, entre epiglotis, hioides y tiroides).
const PRE_EPI = [
  p(29.4, 103, 0, 0, 1), p(34.8, 110.4, 0, 0, 1), p(39.6, 111.4, 0, 0, 1), p(39.4, 105.6, 0, 0.25, 0.75),
  p(35.6, 100.6, 0, 1), p(34.4, 97, 0, 1), p(30, 96.6, 0, 0.6, 0.4), p(24.6, 95.6, 0, 0.3, 0.7),
];

// Hioides (corte del cuerpo) y su asta mayor (fantasma).
const HYOID = [
  p(34.4, 96.6, 0, 1), p(39.2, 95.2, 0, 1), p(43.4, 96.8, 0, 1), p(43.2, 99.8, 0, 1), p(37.6, 101, 0, 1),
  p(34.6, 99.6, 0, 1),
];
const HYOID_HORN = [p(35, 98, 0, 1), p(25, 94.6, 0, 1), p(15.6, 89.4, 0, 1)];

// Cartílagos de la laringe (todo sube con la laringe).
const THYROID = [
  p(41.4, 107.6, 0, 0, 1), p(44.6, 110.4, 0, 0, 1), p(43.6, 118, 0, 0, 1), p(41.8, 128.8, 0, 0, 1, 1),
  p(39.6, 129.2, 0, 0, 1), p(40.2, 119, 0, 0, 1), p(39.4, 111, 0, 0, 1),
];
const CRICOID_FRONT = [p(36.2, 135.6, 0, 0, 1), p(40, 135.2, 0, 0, 1), p(40.6, 141.8, 0, 0, 1), p(36.4, 142.2, 0, 0, 1)];
const CRICOID_BACK = [
  p(14.8, 117.8, 0, 0, 1), p(17.6, 118, 0, 0, 1), p(18.8, 140.6, 0, 0, 0.95), p(15.8, 141.6, 0, 0, 0.95),
  p(14.4, 130, 0, 0, 1),
];
const ARYTENOID = [
  p(13, 112.4, 0, 0, 1), p(15.8, 107.4, 0, 0, 1, 1), p(20.4, 108, 0, 0, 1), p(21.2, 113.6, 0, 0, 1),
  p(18, 117.4, 0, 0, 1), p(14.2, 116.8, 0, 0, 1),
];
// Pliegues vocales (en la pared de la laringe).
const VOCAL_FOLD = [p(35.4, 123.4, 0, 0, 1), p(28, 122.6, 0, 0, 1), p(23.4, 123.6, 0, 0, 1), p(28, 124.6, 0, 0, 1)];
const RINGS_Y = [148, 155, 162, 169, 176, 183, 190, 197];

// Músculos suprahioideos (genihioideo) y tirohioideo: los que sostienen la
// laringe arriba en la maniobra de Mendelsohn.
const GENIOHYOID = [
  p(68.6, 93.4, 1), p(68, 97.6, 1), p(55, 100.4, 0.4, 0.6), p(43, 100.4, 0, 1),
  p(43.4, 97.2, 0, 1), p(55, 95.6, 0.4, 0.6),
];
const THYROHYOID = [p(42, 99.6, 0, 1), p(43.8, 100.2, 0, 1), p(44.6, 111, 0, 0, 1), p(41.8, 112.6, 0, 0, 1)];

// Esófago: línea media del lumen (colapsado salvo cuando pasa el bolo).
const ESO_LINE = [p(8.6, 113.6, 0, 0, 0.65), p(9.6, 124, 0, 0, 0.6), p(10, 140, 0, 0, 0.4), p(9.6, 165, 0, 0, 0.12), p(9, 210)];

// Recorrido del bolo (saliva): dorso de la lengua → orofaringe → esófago.
const BOLUS_PATH = [
  p(59, 40.6, 0.3), p(46, 40.2, 0.2), p(31, 45), p(20, 52), p(12.6, 64), p(10.6, 80, 0, 0, 0.15),
  p(10, 96, 0, 0, 0.4), p(9.6, 110, 0, 0, 0.6), p(10, 128, 0, 0, 0.5), p(9.8, 160, 0, 0, 0.15), p(9.2, 200),
];

// Columna cervical (estática): cuerpos vertebrales.
const VERTEBRAE = [
  { top: 67, bot: 80, front: 1.2 }, { top: 84.4, bot: 97.4, front: 1.2 }, { top: 101.6, bot: 114.6, front: 0.4 },
  { top: 118.8, bot: 131.8, front: -0.8 }, { top: 136, bot: 149, front: -2.6 }, { top: 153.4, bot: 167, front: -5 },
  { top: 171, bot: 185, front: -7.6 }, { top: 189, bot: 203, front: -10.4 },
];

// Línea de contacto lengua-paladar (brilla en el isométrico).
const CONTACT = [p(80.4, 46.6), p(74, 40.6), p(64, 36.2), p(53, 35.2), p(43, 35.6), p(37.4, 37.4)];

// ---------------------------------------------------------------------------

function velumShape(params) {
  return morph(VELUM, VELUM_T, params, { a: 0, jx: 0, H: { x: 0, y: 0 }, L: { x: 0, y: 0 } });
}

function epiglottisShape(params, rig) {
  const k = smooth(params.epi ?? 0);
  return EPI_REST.map((r, i) => {
    const f = EPI_FOLD[i];
    return skinPoint({ x: lerp(r[0], f[0], k), y: lerp(r[1], f[1], k), l: lerp(EPI_L[i], 1, k) }, rig);
  });
}

// Pared faríngea posterior: avanza (constricción) en una campana centrada en
// la orofaringe, más la cresta de Passavant cuando sube el velo.
function wallShift(y, params) {
  const phx = params.phx ?? 0;
  const velum = params.velum ?? 0;
  return phx * 7.5 * bump(y, 66, 48) + velum * 2 * bump(y, 28, 14);
}

function airShape(params, rig) {
  return AIR.map((pt, i) => {
    const s = skinPoint(pt, rig);
    if (i >= AIR_WALL_FIRST && i <= AIR_WALL_LAST) s.x += wallShift(pt.y, params);
    return s;
  });
}

function esophagus(params, rig, bolusY) {
  const line = skinAll(ESO_LINE, rig);
  const open = clamp01(params.ues ?? 0);
  const left = [];
  const right = [];
  const N = 16;
  for (let i = 0; i <= N; i++) {
    const q = alongPolyline(line, i / N);
    const len = Math.hypot(q.dx, q.dy) || 1;
    const nx = -q.dy / len;
    const ny = q.dx / len;
    const near = bolusY == null ? 0.25 : bump(q.y, bolusY, 22);
    const w = 0.45 + open * 4.2 * (0.25 + 0.75 * near);
    left.push({ x: q.x + nx * w, y: q.y + ny * w });
    right.push({ x: q.x - nx * w, y: q.y - ny * w });
  }
  return smoothPath([...left, ...right.reverse()], true, 0.9);
}

function bolusShape(params, rig) {
  const a = clamp01(params.bolusA ?? 0);
  if (a < 0.01) return { d: '', opacity: 0, y: null };
  const path = skinAll(BOLUS_PATH, rig);
  const s = clamp01(params.bolus ?? 0);
  const q = alongPolyline(path, s);
  const ang = Math.atan2(q.dy, q.dx);
  // Se alarga al bajar por la faringe y se achata en la boca.
  const stretch = 1 + 0.9 * smooth((s - 0.3) / 0.25);
  const size = 0.55 + 0.45 * a;
  const rx = 6.4 * stretch * size;
  const ry = (4.4 / Math.sqrt(stretch)) * size;
  return { d: ellipsePath(q.x, q.y, rx, ry, ang), opacity: a, y: q.y };
}

function staticSpine() {
  const parts = [];
  // Atlas (arco anterior) y axis con su apófisis odontoides.
  parts.push(ellipsePath(3.2, 27, 3.2, 4.8, 0));
  parts.push(smoothPath([
    p(-5.4, 12), p(-1.6, 15.6), p(-2.2, 29), p(0.8, 36.4), p(1.4, 61, 0, 0, 0, 1), p(-15.4, 62.6, 0, 0, 0, 1),
    p(-16.4, 42), p(-11.6, 30), p(-10.2, 17),
  ], true, 0.9));
  for (const v of VERTEBRAE) {
    const f = v.front;
    parts.push(smoothPath([
      p(f, v.top, 0, 0, 0, 1), p(f + 0.6, (v.top + v.bot) / 2), p(f, v.bot, 0, 0, 0, 1),
      p(f - 15.8, v.bot + 0.6, 0, 0, 0, 1), p(f - 16.2, (v.top + v.bot) / 2), p(f - 15.8, v.top + 0.6, 0, 0, 0, 1),
    ], true, 0.6));
  }
  return parts.join('');
}

function rings(rig) {
  return RINGS_Y.map((y) => {
    const l = clamp01(1 - (y - 143) / 60) * 0.95;
    const s = skinPoint({ x: 37.6, y, l }, rig);
    return ellipsePath(s.x, s.y, 1.5, 2, 0);
  }).join('');
}

// Fibras del geniogloso: abanico desde la inserción en el mentón hacia el
// dorso. Ayudan a leer la lengua como músculo (y no como una masa redonda).
const FIBER_TO = [3, 4, 5, 6, 7, 8, 9, 10];
function tongueFibers(t) {
  const o = t[18];
  return FIBER_TO.map((i, n) => {
    const q = t[i];
    const a = 0.18 + 0.02 * n;
    // Sin cruzar los dientes cuando la lengua sale (Masako).
    const b = q.x > 76 ? Math.min(0.86, (76 - o.x) / (q.x - o.x)) : 0.86;
    const mx = lerp(o.x, q.x, 0.5) + (n - 3.5) * 0.4;
    const my = lerp(o.y, q.y, 0.5) + 1.6;
    return smoothPath([
      { x: lerp(o.x, q.x, a), y: lerp(o.y, q.y, a) },
      { x: mx, y: my },
      { x: lerp(o.x, q.x, b), y: lerp(o.y, q.y, b) },
    ], false);
  }).join('');
}

// Flecha que indica la subida de la laringe.
function liftArrow(params, rig) {
  const k = clamp01(params.arrow ?? 0);
  if (k < 0.01) return { d: '', opacity: 0 };
  const x = 63 + rig.L.x * 0.6;
  const y0 = 132 + rig.L.y * 0.5;
  const y1 = y0 - 20;
  const d = `M${x} ${y0}L${x} ${y1}M${x - 4} ${y1 + 4.8}L${x} ${y1}L${x + 4} ${y1 + 4.8}`;
  return { d, opacity: k };
}

// Capas en orden de dibujo. `style` son atributos SVG fijos.
export const SIDE_LAYERS = [
  { id: 'skin', style: { fill: 'url(#tissueGrad)', stroke: C.skinEdge, strokeWidth: 0.8 } },
  { id: 'spine', style: { fill: C.boneDim, opacity: 0.38 } },
  { id: 'constrictor', style: { fill: 'none', stroke: C.blaze, strokeWidth: 2.6, strokeLinecap: 'round', filter: 'url(#glow)' } },
  { id: 'air', style: { fill: C.air, stroke: C.mucosa, strokeWidth: 0.45 } },
  { id: 'turbinates', style: { fill: C.tissueLight, opacity: 0.75, stroke: C.tissueHi, strokeWidth: 0.4 } },
  { id: 'nasalVeil', style: { fill: C.tissue, opacity: 0.42 } },
  { id: 'esophagus', style: { fill: C.air, stroke: C.tissueLight, strokeWidth: 0.4 } },
  { id: 'mandibleGhost', style: { fill: C.bone, opacity: 0.06, stroke: C.bone, strokeWidth: 0.6, strokeOpacity: 0.4 } },
  { id: 'upperIncisor', style: { fill: C.tooth, stroke: C.toothEdge, strokeWidth: 0.35 } },
  { id: 'lowerIncisor', style: { fill: C.tooth, stroke: C.toothEdge, strokeWidth: 0.35 } },
  { id: 'palate', style: { fill: 'url(#boneGrad)', stroke: C.boneEdge, strokeWidth: 0.5 } },
  { id: 'symphysis', style: { fill: 'url(#boneGrad)', stroke: C.boneEdge, strokeWidth: 0.5 } },
  { id: 'preEpi', style: { fill: C.tissue } },
  { id: 'vocalFold', style: { fill: C.tissueLight, opacity: 0.7 } },
  { id: 'geniohyoid', style: { fill: C.muscle } },
  { id: 'thyrohyoid', style: { fill: C.muscle, opacity: 0.85 } },
  { id: 'hyoidHorn', style: { fill: 'none', stroke: C.bone, strokeWidth: 2.4, strokeLinecap: 'round', opacity: 0.22 } },
  { id: 'hyoid', style: { fill: C.bone, stroke: C.boneEdge, strokeWidth: 0.4 } },
  { id: 'thyroid', style: { fill: C.cartilage } },
  { id: 'cricoid', style: { fill: C.cartilage } },
  { id: 'arytenoid', style: { fill: C.cartilage, opacity: 0.8 } },
  { id: 'rings', style: { fill: C.cartilage, opacity: 0.75 } },
  { id: 'velum', style: { fill: C.muscleSoft, stroke: C.tongueEdge, strokeWidth: 0.4 } },
  { id: 'tongue', style: { fill: 'url(#tongueGrad)', stroke: C.tongueEdge, strokeWidth: 0.5 } },
  { id: 'tongueFibers', style: { fill: 'none', stroke: C.tongueLow, strokeWidth: 0.55, opacity: 0.55, strokeLinecap: 'round' } },
  { id: 'tongueEffort', style: { fill: C.blaze } },
  { id: 'contact', style: { fill: 'none', stroke: C.blaze, strokeWidth: 2.2, strokeLinecap: 'round', filter: 'url(#glow)' } },
  { id: 'epiglottis', style: { fill: C.cartilage, stroke: C.cartilageEdge, strokeWidth: 0.35 } },
  { id: 'upperLip', style: { fill: 'url(#tissueGrad)' } },
  { id: 'lowerLip', style: { fill: 'url(#tissueGrad)' } },
  { id: 'bolus', style: { fill: C.bolus, stroke: C.bolusEdge, strokeWidth: 0.5 } },
  { id: 'arrow', style: { fill: 'none', stroke: C.work, strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' } },
];

const STATIC = {
  spine: staticSpine(),
  turbinates: TURBINATES.map((t) => smoothPath(t, true)).join(''),
  nasalVeil: smoothPath(NASAL_VEIL, true),
  palate: smoothPath(PALATE, true),
  upperIncisor: smoothPath(UPPER_INCISOR, true),
};

// Puntos de anclaje para etiquetas (en coordenadas del dibujo).
export function sideAnchors(params) {
  const rig = rigOf(params);
  const epi = epiglottisShape(params, rig);
  const tongue = morph(TONGUE, TONGUE_T, params, rig);
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  return {
    larynx: skinPoint({ x: 44.6, y: 114, l: 1 }, rig),
    hyoid: skinPoint({ x: 40, y: 98, h: 1 }, rig),
    // Centro de la lengua (promedio de dorso e inserción).
    tongue: { x: (tongue[4].x + tongue[17].x) / 2 - 2, y: (tongue[4].y + tongue[17].y) / 2 - 4 },
    palate: { x: 60, y: 31 },
    velum: { x: 24, y: 42 },
    wall: { x: 4.6 + wallShift(60, params), y: 60 },
    epiglottis: mid(epi[3], epi[8]),
    lips: { x: 103, y: 56 },
  };
}

// Calcula los atributos de cada capa para los parámetros dados.
export function computeSide(params) {
  const rig = rigOf(params);
  const out = {};
  for (const id of Object.keys(STATIC)) out[id] = { d: STATIC[id] };

  out.skin = { d: smoothPath(morph(SKIN, LIP_OUT_SKIN, params, rig), true) };
  out.air = { d: smoothPath(airShape(params, rig), true, 0.95) };
  const bolus = bolusShape(params, rig);
  out.esophagus = { d: esophagus(params, rig, bolus.y) };
  out.mandibleGhost = { d: smoothPath(skinAll(MANDIBLE_GHOST, rig), true) };
  out.symphysis = { d: smoothPath(skinAll(SYMPHYSIS, rig), true) };
  out.lowerIncisor = { d: smoothPath(skinAll(LOWER_INCISOR, rig), true) };
  out.upperLip = { d: smoothPath(morph(UPPER_LIP, UPPER_LIP_T, params, rig), true) };
  out.lowerLip = { d: smoothPath(morph(LOWER_LIP, LOWER_LIP_T, params, rig), true) };
  out.velum = { d: smoothPath(velumShape(params), true) };

  const tongueEffort = clamp01(params.tongueEffort ?? 0);
  const tongue = morph(TONGUE, TONGUE_T, params, rig);
  const tongueD = smoothPath(tongue, true);
  out.tongue = { d: tongueD };
  out.tongueFibers = { d: tongueFibers(tongue) };
  out.tongueEffort = { d: tongueD, opacity: tongueEffort * 0.55 };

  const epi = epiglottisShape(params, rig);
  out.epiglottis = { d: smoothPath(epi, true, 0.9) };
  // El tejido pre-epiglótico sigue la cara lingual de la epiglotis.
  const pre = skinAll(PRE_EPI, rig);
  pre[0] = epi[10];
  pre[1] = epi[11];
  pre[7] = epi[9];
  out.preEpi = { d: smoothPath(pre, true, 0.8) };

  out.hyoid = { d: smoothPath(skinAll(HYOID, rig), true) };
  out.hyoidHorn = { d: smoothPath(skinAll(HYOID_HORN, rig), false) };
  out.thyroid = { d: smoothPath(skinAll(THYROID, rig), true) };
  out.cricoid = { d: smoothPath(skinAll(CRICOID_FRONT, rig), true, 0.6) + smoothPath(skinAll(CRICOID_BACK, rig), true, 0.8) };
  out.arytenoid = { d: smoothPath(skinAll(ARYTENOID, rig), true, 0.8) };
  out.vocalFold = { d: smoothPath(skinAll(VOCAL_FOLD, rig), true) };
  out.rings = { d: rings(rig) };

  const supra = clamp01(params.supraEffort ?? 0);
  const supraFill = mixColor(C.muscle, C.blaze, supra);
  out.geniohyoid = { d: smoothPath(skinAll(GENIOHYOID, rig), true), fill: supraFill };
  out.thyrohyoid = { d: smoothPath(skinAll(THYROHYOID, rig), true), fill: supraFill };

  // Constrictor faríngeo (pared posterior), visible cuando trabaja.
  const wall = [];
  for (let y = 30; y <= 102; y += 8) wall.push({ x: 3.4 + wallShift(y, params), y });
  out.constrictor = { d: smoothPath(wall, false), opacity: clamp01(params.wallEffort ?? 0) };

  out.bolus = { d: bolus.d, opacity: bolus.opacity };
  out.contact = { d: smoothPath(CONTACT, false), opacity: clamp01(params.glow ?? 0) };

  const arrow = liftArrow(params, rig);
  out.arrow = { d: arrow.d, opacity: arrow.opacity };
  return out;
}
