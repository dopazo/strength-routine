import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Proporciones del muñeco (unidades ≈ metros; mide ~1.92 de pie).
// La pelvis (root = centro de las articulaciones de cadera) queda a 1.0 del
// suelo con las piernas estiradas: muslo + pierna + altura de tobillo.
export const DIM = {
  hipX: 0.1,
  thigh: 0.48,
  shin: 0.45,
  ankleH: 0.07,
  spineY: 0.24,      // pelvis (lumbar) → articulación torácica
  shoulderY: 0.33,   // torácica → línea de hombros (hombros a 1.57 de pie)
  shoulderX: 0.2,
  neckY: 0.35,       // torácica → base del cuello
  upperArm: 0.34,
  forearm: 0.3,
  grip: 0.05,        // muñeca → centro del puño (donde se sujeta la banda)
};

// Articulaciones que una pose controla (rotaciones locales como cuaterniones).
export const RIG_JOINTS = [
  'root', 'lumbar', 'thoracic', 'neck',
  'shoulderL', 'shoulderR', 'elbowL', 'elbowR',
  'hipL', 'hipR', 'kneeL', 'kneeR',
];

const HALF_FRONT = [-Math.PI / 2, Math.PI];  // thetaStart/thetaLength del semicilindro +Z
const HALF_BACK = [Math.PI / 2, Math.PI];    // semicilindro -Z

// Segmento cónico que cuelga hacia -Y desde el origen del padre. Con theta se
// obtiene medio cilindro (frente = +Z, que es hacia donde mira el muñeco).
function limb(material, length, rTop, rBottom, theta = [0, Math.PI * 2]) {
  const geo = new THREE.CylinderGeometry(rTop, rBottom, length, 18, 1, false, theta[0], theta[1]);
  geo.translate(0, -length / 2, 0);
  return new THREE.Mesh(geo, material);
}

function sphere(material, r) {
  return new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), material);
}

function ellipsoid(material, rx, ry, rz) {
  const geo = new THREE.SphereGeometry(1, 24, 16);
  geo.scale(rx, ry, rz);
  return new THREE.Mesh(geo, material);
}

// Medio elipsoide: frente (+Z) o espalda (-Z). Permite teñir pecho y espalda
// (o pelvis y glúteos) de forma independiente.
function halfEllipsoid(material, rx, ry, rz, front) {
  const geo = new THREE.SphereGeometry(1, 24, 16, front ? 0 : Math.PI, Math.PI);
  geo.scale(rx, ry, rz);
  return new THREE.Mesh(geo, material);
}

const smooth01 = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Mitad (frente o espalda) de la caja torácica: un elipsoide deformado que se
// angosta hacia la cintura y es más plano abajo, con hombros anchos arriba
// (perfil de superelipse) para dar una silueta en V en vez de un barril.
// Las normales salen del gradiente de la superficie implícita, así no aparece
// un pliegue en la costura lateral entre ambas mitades.
function ribcageHalf(material, front) {
  const rx = 0.17;
  const ry = 0.2;
  const rz = front ? 0.106 : 0.114;
  // Ancho y profundidad según la altura normalizada t (0 abajo, 1 arriba).
  const width = (t) => 0.7 + 0.3 * smooth01(0.0, 0.7, t);
  const depth = (t) => 0.84 + 0.16 * smooth01(0.08, 0.6, t);
  // Radio horizontal relativo según la altura: redondeado abajo (p = 2) y más
  // cuadrado arriba (p = 3.2), que es donde se unen los hombros.
  const profile = (u) => {
    const p = u > 0 ? 3.2 : 2;
    return Math.max(0, 1 - Math.abs(u) ** p) ** (1 / p);
  };
  const G = (x, y, z) => {
    const t = (y / ry + 1) / 2;
    return Math.hypot(x / (rx * width(t)), z / (rz * depth(t))) - profile(y / ry);
  };
  const geo = new THREE.SphereGeometry(1, 28, 18, front ? 0 : Math.PI, Math.PI);
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const n = new THREE.Vector3();
  const h = 1e-4;
  for (let i = 0; i < pos.count; i++) {
    const ux = pos.getX(i);
    const uy = pos.getY(i);
    const uz = pos.getZ(i);
    const t = (uy + 1) / 2;
    const ring = Math.sqrt(Math.max(0, 1 - uy * uy));
    const k = ring > 1e-6 ? profile(uy) / ring : 0;
    const x = ux * k * rx * width(t);
    const y = uy * ry;
    const z = uz * k * rz * depth(t);
    pos.setXYZ(i, x, y, z);
    if (k === 0) {
      n.set(0, Math.sign(uy), 0);
    } else {
      n.set(
        G(x + h, y, z) - G(x - h, y, z),
        G(x, y + h, z) - G(x, y - h, z),
        G(x, y, z + h) - G(x, y, z - h),
      ).normalize();
    }
    nor.setXYZ(i, n.x, n.y, n.z);
  }
  geo.computeBoundingSphere();
  return new THREE.Mesh(geo, material);
}

function capsuleX(material, r, length) {
  const geo = new THREE.CapsuleGeometry(r, length, 6, 14);
  geo.rotateZ(Math.PI / 2);
  return new THREE.Mesh(geo, material);
}

function node(parent, x = 0, y = 0, z = 0) {
  const o = new THREE.Object3D();
  o.position.set(x, y, z);
  parent.add(o);
  return o;
}

function group(parent, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

function buildArm(parent, side, mk) {
  const sx = side === 'L' ? -1 : 1;
  const shoulder = group(parent, sx * DIM.shoulderX, DIM.shoulderY, 0);
  // Deltoides: esfera en la articulación, teñible para ejercicios de hombro.
  const shoulderCap = mk.add(shoulder, sphere(null, 0.064), `shoulderCap${side}`);
  // Brazo dividido en bíceps (frente) y tríceps (atrás).
  const biceps = mk.add(shoulder, limb(null, DIM.upperArm, 0.052, 0.04, HALF_FRONT), `biceps${side}`);
  const triceps = mk.add(shoulder, limb(null, DIM.upperArm, 0.052, 0.04, HALF_BACK), `triceps${side}`);
  const elbow = group(shoulder, 0, -DIM.upperArm, 0);
  mk.add(elbow, sphere(null, 0.041));
  mk.add(elbow, limb(null, DIM.forearm, 0.042, 0.03), `forearm${side}`);
  // El puño no rota respecto del antebrazo: va en la misma malla del codo.
  const fist = mk.add(elbow, ellipsoid(null, 0.04, 0.05, 0.034));
  if (fist) fist.position.y = -DIM.forearm - 0.042;
  const hand = node(elbow, 0, -DIM.forearm - DIM.grip, 0);
  return { shoulder, elbow, hand };
}

function buildLeg(parent, side, mk) {
  const sx = side === 'L' ? -1 : 1;
  const hip = group(parent, sx * DIM.hipX, 0, 0);
  mk.add(hip, limb(null, DIM.thigh, 0.078, 0.055, HALF_FRONT), `quads${side}`);
  mk.add(hip, limb(null, DIM.thigh, 0.078, 0.055, HALF_BACK), `hamstrings${side}`);
  const knee = group(hip, 0, -DIM.thigh, 0);
  mk.add(knee, sphere(null, 0.054));
  mk.add(knee, limb(null, DIM.shin, 0.055, 0.037), `shin${side}`);
  // El tobillo es una articulación propia: tras la IK se orienta para que el
  // pie quede plano en el suelo aunque la pierna se incline.
  const ankle = group(knee, 0, -DIM.shin, 0);
  mk.add(ankle, sphere(null, 0.037));
  if (mk.enabled) {
    const geo = new THREE.CapsuleGeometry(0.041, 0.14, 6, 14);
    geo.rotateX(Math.PI / 2);
    geo.scale(1.05, 0.8, 1);
    geo.translate(0, -DIM.ankleH + 0.041 * 0.8, 0.055);
    mk.add(ankle, new THREE.Mesh(geo, null));
  }
  // Puntos de apoyo de la banda bajo la planta: centro y borde externo.
  const foot = node(ankle, 0, -DIM.ankleH + 0.004, 0.05);
  const soleOuter = node(ankle, sx * 0.052, -DIM.ankleH + 0.004, 0.05);
  return { hip, knee, ankle, foot, soleOuter };
}

// Torso en dos tramos: `lumbar` pivota en la cadera (bisagra de cadera real,
// lleva pelvis y abdomen) y `thoracic` en la cintura (pecho, hombros, cuello).
function buildTorso(root, mk) {
  const lumbar = group(root);
  const pelvis = mk.add(lumbar, halfEllipsoid(null, 0.165, 0.12, 0.11, true));
  const glutes = mk.add(lumbar, halfEllipsoid(null, 0.165, 0.12, 0.118, false), 'glutes');
  if (pelvis) { pelvis.position.y = 0.03; glutes.position.y = 0.03; }
  const abs = mk.add(lumbar, limb(null, 0.24, 0.126, 0.145, HALF_FRONT), 'abs');
  const lowerBack = mk.add(lumbar, limb(null, 0.24, 0.126, 0.145, HALF_BACK), 'lowerBack');
  if (abs) {
    for (const m of [abs, lowerBack]) { m.position.y = 0.3; m.scale.z = 0.74; }
  }

  const thoracic = group(lumbar, 0, DIM.spineY, 0);
  const chest = mk.add(thoracic, ribcageHalf(null, true), 'chest');
  const upperBack = mk.add(thoracic, ribcageHalf(null, false), 'upperBack');
  if (chest) { chest.position.y = 0.155; upperBack.position.y = 0.155; }
  const girdle = mk.add(thoracic, capsuleX(null, 0.056, 0.32));
  if (girdle) girdle.position.set(0, DIM.shoulderY - 0.01, -0.005);

  const neck = group(thoracic, 0, DIM.neckY, 0);
  const neckMesh = mk.add(neck, limb(null, 0.11, 0.043, 0.047));
  if (neckMesh) neckMesh.position.y = 0.11;
  const head = mk.add(neck, ellipsoid(null, 0.098, 0.12, 0.108));
  if (head) head.position.set(0, 0.2, 0.012);
  return { lumbar, thoracic, neck };
}

// Construye el esqueleto jerárquico bajo `parent` y devuelve los nodos que una
// pose manipula (RIG_JOINTS), los puntos de contacto (manos, tobillos, plantas)
// y `capsules` (colisión de la banda).
// Para rendir en celulares, todas las piezas que cuelgan de un mismo hueso se
// fusionan en una sola malla con un único material (`createBodyMaterial`): el
// muñeco completo son 13 llamadas de dibujo. Cada vértice guarda a qué músculo
// pertenece (atributo `muscle`) y el shader lo tiñe según `applyTint`.
// Con `{ meshes: false }` crea solo la jerarquía (para cálculos de FK).
export function buildSkeleton(parent, material, { meshes = true } = {}) {
  const buckets = new Map();
  const mk = {
    enabled: meshes,
    // Registra una pieza (aún sin agregarla) para fusionarla al final; quien
    // llama puede ajustar su posición/escala antes de eso.
    add(p, mesh, muscle = null) {
      if (!meshes) {
        mesh.geometry.dispose();
        return null;
      }
      if (!buckets.has(p)) buckets.set(p, []);
      buckets.get(p).push({ mesh, muscle });
      return mesh;
    },
  };

  const root = group(parent);
  const torso = buildTorso(root, mk);
  const armL = buildArm(torso.thoracic, 'L', mk);
  const armR = buildArm(torso.thoracic, 'R', mk);
  // Las piernas cuelgan del root (no del torso): una bisagra de cadera
  // (remo, kickback) inclina el torso sin arrastrar las piernas.
  const legL = buildLeg(root, 'L', mk);
  const legR = buildLeg(root, 'R', mk);

  const parts = new Map();
  for (const [p, items] of buckets) {
    const geos = items.map(({ mesh, muscle }) => {
      mesh.updateMatrix();
      const geo = mesh.geometry.applyMatrix4(mesh.matrix);
      const index = muscle == null ? -1 : MUSCLES.indexOf(muscle);
      geo.setAttribute('muscle', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count).fill(index), 1));
      return geo;
    });
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    const part = new THREE.Mesh(merged, material);
    part.castShadow = true;
    p.add(part);
    parts.set(p, part);
  }

  const capsules = [
    { node: torso.lumbar, a: new THREE.Vector3(-0.09, 0.03, 0), b: new THREE.Vector3(0.09, 0.03, 0), r: 0.11 },
    { node: torso.lumbar, a: new THREE.Vector3(0, 0.1, 0), b: new THREE.Vector3(0, 0.28, 0), r: 0.115 },
    { node: torso.thoracic, a: new THREE.Vector3(0, 0.05, 0), b: new THREE.Vector3(0, 0.26, 0), r: 0.125 },
    ...[legL, legR].flatMap((leg) => [
      { node: leg.hip, a: new THREE.Vector3(0, 0, 0), b: new THREE.Vector3(0, -DIM.thigh, 0), r: 0.07 },
      { node: leg.knee, a: new THREE.Vector3(0, 0, 0), b: new THREE.Vector3(0, -DIM.shin, 0), r: 0.05 },
    ]),
  ];

  return {
    root,
    lumbar: torso.lumbar, thoracic: torso.thoracic, neck: torso.neck,
    shoulderL: armL.shoulder, shoulderR: armR.shoulder,
    elbowL: armL.elbow, elbowR: armR.elbow,
    hipL: legL.hip, hipR: legR.hip,
    kneeL: legL.knee, kneeR: legR.knee,
    ankleL: legL.ankle, ankleR: legR.ankle,
    handL: armL.hand, handR: armR.hand,
    footL: legL.foot, footR: legR.foot,
    soleOuterL: legL.soleOuter, soleOuterR: legR.soleOuter,
    capsules,
    // Malla fusionada del tórax (la escena la escala al respirar).
    chestPart: parts.get(torso.thoracic) ?? null,
    allMeshes: [...parts.values()],
  };
}

// Músculos teñibles (claves que usan los ejercicios en `works`).
export const MUSCLES = [
  'chest', 'upperBack', 'abs', 'lowerBack', 'glutes',
  'shoulderCapL', 'shoulderCapR', 'bicepsL', 'bicepsR', 'tricepsL', 'tricepsR',
  'forearmL', 'forearmR', 'quadsL', 'quadsR', 'hamstringsL', 'hamstringsR', 'shinL', 'shinR',
];

// Mezcla máxima del color de tinte sobre el color base en el pico de esfuerzo.
const MAX_TINT = 0.7;

// Material único del cuerpo: MeshStandardMaterial con un pequeño agregado al
// shader que mezcla el color de tinte según el nivel de cada músculo.
export function createBodyMaterial(color, tintColor) {
  const levels = new Float32Array(MUSCLES.length);
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.58, metalness: 0.02 });
  const tintUniform = { value: new THREE.Color(tintColor) };
  material.userData.tintLevels = levels;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTint = { value: levels };
    shader.uniforms.uTintColor = tintUniform;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
attribute float muscle;
uniform float uTint[${MUSCLES.length}];
varying float vTint;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vTint = muscle < -0.5 ? 0.0 : uTint[int(muscle + 0.5)];`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform vec3 uTintColor;
varying float vTint;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
diffuseColor.rgb = mix(diffuseColor.rgb, uTintColor, vTint);`);
  };
  material.customProgramCacheKey = () => 'body-tint';
  return material;
}

// Fija el nivel de tinte de cada músculo. `levels` es { clave: 0..1 } ya
// suavizado por quien llama.
export function applyTint(material, levels) {
  const out = material.userData.tintLevels;
  for (let i = 0; i < MUSCLES.length; i++) {
    out[i] = Math.max(0, Math.min(1, levels[MUSCLES[i]] ?? 0)) * MAX_TINT;
  }
}
