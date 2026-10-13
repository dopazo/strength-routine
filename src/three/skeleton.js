import * as THREE from 'three';

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
  const shoulderCap = mk.add(shoulder, sphere(mk.tint(), 0.064));
  // Brazo dividido en bíceps (frente) y tríceps (atrás).
  const biceps = mk.add(shoulder, limb(mk.tint(), DIM.upperArm, 0.052, 0.04, HALF_FRONT));
  const triceps = mk.add(shoulder, limb(mk.tint(), DIM.upperArm, 0.052, 0.04, HALF_BACK));
  const elbow = group(shoulder, 0, -DIM.upperArm, 0);
  mk.add(elbow, sphere(mk.base, 0.041));
  const forearm = mk.add(elbow, limb(mk.tint(), DIM.forearm, 0.042, 0.03));
  const wrist = group(elbow, 0, -DIM.forearm, 0);
  const fist = mk.add(wrist, ellipsoid(mk.base, 0.04, 0.05, 0.034));
  if (fist) fist.position.y = -0.042;
  const hand = node(wrist, 0, -DIM.grip, 0);
  return { shoulder, elbow, hand, shoulderCap, biceps, triceps, forearm };
}

function buildLeg(parent, side, mk) {
  const sx = side === 'L' ? -1 : 1;
  const hip = group(parent, sx * DIM.hipX, 0, 0);
  const quads = mk.add(hip, limb(mk.tint(), DIM.thigh, 0.078, 0.055, HALF_FRONT));
  const hamstrings = mk.add(hip, limb(mk.tint(), DIM.thigh, 0.078, 0.055, HALF_BACK));
  const knee = group(hip, 0, -DIM.thigh, 0);
  mk.add(knee, sphere(mk.base, 0.054));
  const shin = mk.add(knee, limb(mk.tint(), DIM.shin, 0.055, 0.037));
  // El tobillo es una articulación propia: tras la IK se orienta para que el
  // pie quede plano en el suelo aunque la pierna se incline.
  const ankle = group(knee, 0, -DIM.shin, 0);
  mk.add(ankle, sphere(mk.base, 0.037));
  if (mk.enabled) {
    const geo = new THREE.CapsuleGeometry(0.041, 0.14, 6, 14);
    geo.rotateX(Math.PI / 2);
    geo.scale(1.05, 0.8, 1);
    geo.translate(0, -DIM.ankleH + 0.041 * 0.8, 0.055);
    mk.add(ankle, new THREE.Mesh(geo, mk.base));
  }
  // Puntos de apoyo de la banda bajo la planta: centro y borde externo.
  const foot = node(ankle, 0, -DIM.ankleH + 0.004, 0.05);
  const soleOuter = node(ankle, sx * 0.052, -DIM.ankleH + 0.004, 0.05);
  return { hip, knee, ankle, foot, soleOuter, quads, hamstrings, shin };
}

// Torso en dos tramos: `lumbar` pivota en la cadera (bisagra de cadera real,
// lleva pelvis y abdomen) y `thoracic` en la cintura (pecho, hombros, cuello).
function buildTorso(root, mk) {
  const lumbar = group(root);
  const pelvis = mk.add(lumbar, halfEllipsoid(mk.base, 0.165, 0.12, 0.11, true));
  const glutes = mk.add(lumbar, halfEllipsoid(mk.tint(), 0.165, 0.12, 0.118, false));
  if (pelvis) { pelvis.position.y = 0.03; glutes.position.y = 0.03; }
  const abs = mk.add(lumbar, limb(mk.tint(), 0.24, 0.135, 0.15, HALF_FRONT));
  const lowerBack = mk.add(lumbar, limb(mk.tint(), 0.24, 0.135, 0.15, HALF_BACK));
  if (abs) {
    for (const m of [abs, lowerBack]) { m.position.y = 0.3; m.scale.z = 0.74; }
  }

  const thoracic = group(lumbar, 0, DIM.spineY, 0);
  const chest = mk.add(thoracic, halfEllipsoid(mk.tint(), 0.2, 0.2, 0.125, true));
  const upperBack = mk.add(thoracic, halfEllipsoid(mk.tint(), 0.2, 0.2, 0.13, false));
  if (chest) { chest.position.y = 0.15; upperBack.position.y = 0.15; }
  const girdle = mk.add(thoracic, capsuleX(mk.base, 0.056, 0.32));
  if (girdle) girdle.position.set(0, DIM.shoulderY - 0.01, -0.005);

  const neck = group(thoracic, 0, DIM.neckY, 0);
  const neckMesh = mk.add(neck, limb(mk.base, 0.11, 0.043, 0.047));
  if (neckMesh) neckMesh.position.y = 0.11;
  const head = mk.add(neck, ellipsoid(mk.base, 0.098, 0.12, 0.108));
  if (head) head.position.set(0, 0.2, 0.012);
  return { lumbar, thoracic, neck, chest, upperBack, abs, lowerBack, glutes };
}

// Construye el esqueleto jerárquico bajo `parent` y devuelve los nodos que una
// pose manipula (RIG_JOINTS), los puntos de contacto (manos, tobillos, plantas),
// `meshes` con las partes teñibles y `capsules` (colisión de la banda).
// Con `{ meshes: false }` crea solo la jerarquía (para cálculos de FK).
export function buildSkeleton(parent, material, { meshes = true } = {}) {
  const all = [];
  const mk = {
    enabled: meshes,
    base: material,
    tint: () => (meshes ? material.clone() : null),
    add(p, mesh) {
      if (!meshes) {
        mesh.geometry.dispose();
        return null;
      }
      mesh.castShadow = true;
      p.add(mesh);
      all.push(mesh);
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

  const capsules = [
    { node: torso.lumbar, a: new THREE.Vector3(-0.09, 0.03, 0), b: new THREE.Vector3(0.09, 0.03, 0), r: 0.11 },
    { node: torso.lumbar, a: new THREE.Vector3(0, 0.1, 0), b: new THREE.Vector3(0, 0.28, 0), r: 0.115 },
    { node: torso.thoracic, a: new THREE.Vector3(0, 0.04, 0), b: new THREE.Vector3(0, 0.26, 0), r: 0.14 },
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
    allMeshes: all,
    meshes: meshes ? {
      chest: torso.chest, upperBack: torso.upperBack,
      abs: torso.abs, lowerBack: torso.lowerBack, glutes: torso.glutes,
      shoulderCapL: armL.shoulderCap, shoulderCapR: armR.shoulderCap,
      bicepsL: armL.biceps, bicepsR: armR.biceps,
      tricepsL: armL.triceps, tricepsR: armR.triceps,
      forearmL: armL.forearm, forearmR: armR.forearm,
      quadsL: legL.quads, quadsR: legR.quads,
      hamstringsL: legL.hamstrings, hamstringsR: legR.hamstrings,
      shinL: legL.shin, shinR: legR.shin,
    } : {},
  };
}

// Mezcla máxima del color de tinte sobre el color base en el pico de esfuerzo.
const MAX_TINT = 0.7;

// Tiñe cada mesh según su nivel de activación (0..1). `levels` es un objeto
// { meshKey: nivel } ya suavizado por quien llama.
export function applyTint(meshes, levels, baseColor, tintColor) {
  for (const [key, mesh] of Object.entries(meshes)) {
    const f = Math.max(0, Math.min(1, levels[key] ?? 0)) * MAX_TINT;
    mesh.material.color.copy(baseColor).lerp(tintColor, f);
  }
}
