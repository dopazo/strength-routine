import * as THREE from 'three';
import { buildSkeleton, DIM, RIG_JOINTS } from './skeleton.js';

// ---------------------------------------------------------------------------
// RigPose: representación interna de una pose, lista para interpolar.
//   { rootPos: Vector3, q: { [joint]: Quaternion } }
// Las poses de datos (src/data/poses.js) usan ángulos de Euler XYZ; aquí se
// convierten una sola vez a cuaterniones para interpolar con slerp, que sigue
// el camino de rotación más corto y evita los giros raros de interpolar
// ángulos de Euler eje por eje.
// ---------------------------------------------------------------------------

const _euler = new THREE.Euler();

function quatFromEuler(x, y, z) {
  return new THREE.Quaternion().setFromEuler(_euler.set(x, y, z, 'XYZ'));
}

// Reparto de `torsoRot` entre la bisagra de cadera (lumbar) y la columna
// torácica, por eje [x, y, z]: la flexión ocurre sobre todo en la cadera,
// mientras que el giro y la inclinación lateral los hace la columna alta.
const LUMBAR_SHARE = [0.78, 0.35, 0.4];

export function createRigPose() {
  const q = {};
  for (const j of RIG_JOINTS) q[j] = new THREE.Quaternion();
  return { rootPos: new THREE.Vector3(), q };
}

const rigCache = new WeakMap();

// Convierte una pose de datos en RigPose (memoizado por objeto de pose).
export function poseToRig(pose) {
  let rig = rigCache.get(pose);
  if (rig) return rig;
  rig = createRigPose();
  rig.rootPos.fromArray(pose.rootPos);
  rig.q.root.copy(quatFromEuler(...pose.rootRot));
  const [tx, ty, tz] = pose.torsoRot;
  if (pose.lumbarRot && pose.thoracicRot) {
    // Control explícito de cada tramo (p. ej. puente de glúteos: la zona
    // lumbar sube y la espalda alta queda apoyada).
    rig.q.lumbar.copy(quatFromEuler(...pose.lumbarRot));
    rig.q.thoracic.copy(quatFromEuler(...pose.thoracicRot));
  } else {
    rig.q.lumbar.copy(quatFromEuler(tx * LUMBAR_SHARE[0], ty * LUMBAR_SHARE[1], tz * LUMBAR_SHARE[2]));
    rig.q.thoracic.copy(quatFromEuler(tx * (1 - LUMBAR_SHARE[0]), ty * (1 - LUMBAR_SHARE[1]), tz * (1 - LUMBAR_SHARE[2])));
  }
  // Cabeza: si la pose no la define, compensa parte de la inclinación del
  // torso para que la mirada no quede pegada al suelo.
  const head = pose.headRot ?? [-0.3 * tx, 0, -0.4 * tz];
  rig.q.neck.copy(quatFromEuler(...head));
  for (const j of ['shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'hipL', 'hipR', 'kneeL', 'kneeR']) {
    rig.q[j].copy(quatFromEuler(...pose[j]));
  }
  rig.posture = pose.rootPos[1] < 0.5 ? 'floor' : 'stand';
  rigCache.set(pose, rig);
  return rig;
}

export function copyRig(src, out = createRigPose()) {
  out.rootPos.copy(src.rootPos);
  for (const j of RIG_JOINTS) out.q[j].copy(src.q[j]);
  out.posture = src.posture;
  return out;
}

// out = mezcla de a → b con factor k (slerp en rotaciones, lerp en posición).
export function blendRig(a, b, k, out) {
  out.rootPos.lerpVectors(a.rootPos, b.rootPos, k);
  for (const j of RIG_JOINTS) out.q[j].slerpQuaternions(a.q[j], b.q[j], k);
  out.posture = k < 0.5 ? a.posture : b.posture;
  return out;
}

export function rigPosture(rig) {
  return rig.rootPos.y < 0.5 ? 'floor' : 'stand';
}

export function applyRig(joints, rig) {
  joints.root.position.copy(rig.rootPos);
  for (const j of RIG_JOINTS) joints[j].quaternion.copy(rig.q[j]);
  joints.root.updateMatrixWorld(true);
}

// ---------------------------------------------------------------------------
// Cinemática directa auxiliar: un esqueleto sin mallas para calcular dónde
// quedan manos y pies en una pose (objetivos de IK, largo natural de banda).
// ---------------------------------------------------------------------------

let scratch = null;
export function getScratchSkeleton() {
  if (!scratch) {
    const holder = new THREE.Group();
    scratch = buildSkeleton(holder, null, { meshes: false });
    scratch.holder = holder;
  }
  return scratch;
}

const contactCache = new WeakMap();

function readContacts(joints) {
  const w = (o) => o.getWorldPosition(new THREE.Vector3());
  return {
    feet: [w(joints.ankleL), w(joints.ankleR)],
    hands: [w(joints.handL), w(joints.handR)],
  };
}

// Posiciones mundiales de tobillos y manos para un RigPose (FK pura).
export function rigContacts(rig, { cache = true } = {}) {
  if (cache) {
    const hit = contactCache.get(rig);
    if (hit) return hit;
  }
  const sk = getScratchSkeleton();
  applyRig(sk, rig);
  const c = readContacts(sk);
  if (cache) contactCache.set(rig, c);
  return c;
}

export function liveContacts(joints) {
  return readContacts(joints);
}

// ---------------------------------------------------------------------------
// IK analítica de dos huesos (cadera-rodilla-tobillo, hombro-codo-mano).
// Ambos huesos cuelgan en -Y local y la articulación intermedia es una
// bisagra en X. `bendSign` = +1 para rodilla (se flexiona hacia atrás) y -1
// para codo (hacia adelante). El plano de flexión se toma de la pose FK
// actual, así se respeta la orientación de rodilla/codo que pide la pose.
// ---------------------------------------------------------------------------

const _v = new THREE.Vector3();
const _t = new THREE.Vector3();
const _f = new THREE.Vector3();
const _a = new THREE.Vector3();
const _n = new THREE.Vector3();
const _b = new THREE.Vector3();
const _a2 = new THREE.Vector3();
const _n2 = new THREE.Vector3();
const _b2 = new THREE.Vector3();
const _m1 = new THREE.Matrix4();
const _m2 = new THREE.Matrix4();
const _inv = new THREE.Matrix4();
const _qUpper = new THREE.Quaternion();
const _qLower = new THREE.Quaternion();
const _qFkUpper = new THREE.Quaternion();
const _qFkLower = new THREE.Quaternion();
const X_AXIS = new THREE.Vector3(1, 0, 0);
const Y_AXIS = new THREE.Vector3(0, 1, 0);

export function solveTwoBone(upper, lower, l1, l2, bendSign, targetWorld, weight = 1) {
  if (weight <= 0.0001) return;
  _inv.copy(upper.parent.matrixWorld).invert();
  _t.copy(targetWorld).applyMatrix4(_inv);
  _v.subVectors(_t, upper.position);
  const minL = Math.abs(l1 - l2) + 1e-3;
  const maxL = (l1 + l2) * 0.9995;
  const L = THREE.MathUtils.clamp(_v.length(), minL, maxL);
  const cosK = THREE.MathUtils.clamp((l1 * l1 + l2 * l2 - L * L) / (2 * l1 * l2), -1, 1);
  const phi = Math.PI - Math.acos(cosK);

  // Dirección cadera→tobillo en el marco local del hueso superior sin rotar.
  _f.set(0, -l1 - l2 * Math.cos(phi), -bendSign * l2 * Math.sin(phi)).normalize();
  _a.copy(_f);
  _n.copy(X_AXIS);
  _b.crossVectors(_a, _n);

  // Base deseada: eje hacia el objetivo y eje de flexión heredado de la FK.
  _a2.copy(_v).normalize();
  _n2.copy(X_AXIS).applyQuaternion(upper.quaternion);
  _n2.addScaledVector(_a2, -_n2.dot(_a2));
  if (_n2.lengthSq() < 1e-6) {
    _n2.copy(X_AXIS).addScaledVector(_a2, -_a2.x);
  }
  _n2.normalize();
  _b2.crossVectors(_a2, _n2);

  _m1.makeBasis(_a, _n, _b);
  _m2.makeBasis(_a2, _n2, _b2);
  _m2.multiply(_m1.transpose());
  _qUpper.setFromRotationMatrix(_m2);
  _qLower.setFromAxisAngle(X_AXIS, bendSign * phi);

  if (weight < 0.9999) {
    _qFkUpper.copy(upper.quaternion);
    _qFkLower.copy(lower.quaternion);
    _qUpper.slerpQuaternions(_qFkUpper, _qUpper, weight);
    _qLower.slerpQuaternions(_qFkLower, _qLower, weight);
  }
  upper.quaternion.copy(_qUpper);
  lower.quaternion.copy(_qLower);
  upper.updateMatrixWorld(true);
}

export function solveLeg(joints, side, target, weight = 1) {
  solveTwoBone(joints[`hip${side}`], joints[`knee${side}`], DIM.thigh, DIM.shin, 1, target, weight);
}

export function solveArm(joints, side, target, weight = 1) {
  solveTwoBone(joints[`shoulder${side}`], joints[`elbow${side}`], DIM.upperArm, DIM.forearm + DIM.grip, -1, target, weight);
}

// Deja el pie plano sobre el suelo mirando hacia adelante (según el eje de
// flexión de la cadera), con una leve apertura de punta.
const _qHip = new THREE.Quaternion();
const _qKnee = new THREE.Quaternion();
const _qFoot = new THREE.Quaternion();
const _side = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const TOE_OUT = 0.12;

export function orientFoot(joints, side) {
  const hip = joints[`hip${side}`];
  const knee = joints[`knee${side}`];
  const ankle = joints[`ankle${side}`];
  // Las matrices ya están al día tras la IK (y los huesos no tienen escala).
  _qHip.setFromRotationMatrix(hip.matrixWorld);
  _side.copy(X_AXIS).applyQuaternion(_qHip);
  _side.y = 0;
  if (_side.lengthSq() < 1e-4) _side.copy(X_AXIS);
  _side.normalize();
  _fwd.crossVectors(_side, Y_AXIS).normalize();
  _m1.makeBasis(_side, Y_AXIS, _fwd);
  _qFoot.setFromRotationMatrix(_m1);
  _qFoot.multiply(_qKnee.setFromAxisAngle(Y_AXIS, side === 'L' ? -TOE_OUT : TOE_OUT));
  _qKnee.setFromRotationMatrix(knee.matrixWorld);
  ankle.quaternion.copy(_qKnee.invert().multiply(_qFoot));
  ankle.updateMatrixWorld(true);
}
