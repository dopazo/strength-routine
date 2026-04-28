import * as THREE from 'three';

function makeBone(material, length, radius = 0.055) {
  const geo = new THREE.CylinderGeometry(radius, radius, length, 12);
  geo.translate(0, -length / 2, 0);
  return new THREE.Mesh(geo, material);
}

// Mitad de cilindro para separar bíceps (frontal) de tríceps (trasera).
// thetaStart=0, thetaLength=PI cubre el semicilindro hacia +Z (frente del personaje).
function makeHalfBone(material, length, radius, thetaStart, thetaLength) {
  const geo = new THREE.CylinderGeometry(radius, radius, length, 12, 1, false, thetaStart, thetaLength);
  geo.translate(0, -length / 2, 0);
  return new THREE.Mesh(geo, material);
}

function makeJoint(material, radius = 0.075) {
  return new THREE.Mesh(new THREE.SphereGeometry(radius, 14, 14), material);
}

function buildArm(parent, side, material) {
  const sx = side === 'L' ? -1 : 1;
  const shoulder = new THREE.Group();
  shoulder.position.set(sx * 0.28, 0.3, 0);
  parent.add(shoulder);

  // Cap del hombro (deltoides) — esfera pequeña en la articulación, teñible de
  // forma independiente para resaltar trabajo de hombros.
  const shoulderCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.085, 14, 14),
    material.clone(),
  );
  shoulder.add(shoulderCap);

  // Brazo superior dividido en dos semicilindros: biceps (+Z, frontal) y triceps (-Z, trasero).
  const upperArm = new THREE.Group();
  shoulder.add(upperArm);
  const upperLen = 0.4;
  const upperRad = 0.055;
  const biceps = makeHalfBone(material.clone(), upperLen, upperRad, 0, Math.PI);
  const triceps = makeHalfBone(material.clone(), upperLen, upperRad, Math.PI, Math.PI);
  upperArm.add(biceps);
  upperArm.add(triceps);

  const elbow = new THREE.Group();
  elbow.position.y = -upperLen;
  upperArm.add(elbow);
  const forearm = makeBone(material.clone(), 0.38);
  elbow.add(forearm);
  const hand = new THREE.Object3D();
  hand.position.y = -0.38;
  elbow.add(hand);
  return { shoulder, elbow, hand, biceps, triceps, forearm, shoulderCap };
}

function buildLeg(parent, side, material) {
  const sx = side === 'L' ? -1 : 1;
  const hip = new THREE.Group();
  // Cadera ubicada respecto al root (mismo y que la base del torso, ancho de hombros / 2).
  hip.position.set(sx * 0.15, -0.35, 0);
  parent.add(hip);
  const thigh = makeBone(material.clone(), 0.5, 0.07);
  hip.add(thigh);
  const knee = new THREE.Group();
  knee.position.y = -0.5;
  thigh.add(knee);
  const shin = makeBone(material.clone(), 0.45, 0.06);
  knee.add(shin);
  const foot = new THREE.Object3D();
  foot.position.y = -0.45;
  knee.add(foot);
  return { hip, knee, foot, thigh, shin };
}

// Torso dividido en dos cajas (mitad delantera = pecho, mitad trasera = espalda alta).
function buildTorso(parent, material) {
  const torso = new THREE.Group();
  parent.add(torso);
  const chest = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.7, 0.125),
    material.clone(),
  );
  chest.position.z = 0.0625;
  torso.add(chest);
  const upperBack = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.7, 0.125),
    material.clone(),
  );
  upperBack.position.z = -0.0625;
  torso.add(upperBack);
  return { torso, chest, upperBack };
}

// Construye un esqueleto jerárquico bajo `scene` y devuelve los nodos
// que cualquier pose puede manipular (los mismos keys que existen en POSES).
// Devuelve también `meshes` con referencias a las partes teñibles.
export function buildSkeleton(scene, material) {
  const root = new THREE.Group();
  scene.add(root);

  const { torso, chest, upperBack } = buildTorso(root, material);

  const head = makeJoint(material, 0.17);
  head.position.y = 0.55;
  torso.add(head);

  const armL = buildArm(torso, 'L', material);
  const armR = buildArm(torso, 'R', material);
  // Las piernas cuelgan del root (no del torso). Si fueran hijas del torso,
  // bisagras de cadera (RDL/remo/kickback) rotarían toda la figura.
  const legL = buildLeg(root, 'L', material);
  const legR = buildLeg(root, 'R', material);

  return {
    root, torso,
    shoulderL: armL.shoulder, shoulderR: armR.shoulder,
    elbowL: armL.elbow, elbowR: armR.elbow,
    hipL: legL.hip, hipR: legR.hip,
    kneeL: legL.knee, kneeR: legR.knee,
    handL: armL.hand, handR: armR.hand,
    footL: legL.foot, footR: legR.foot,
    meshes: {
      chest, upperBack,
      shoulderCapL: armL.shoulderCap, shoulderCapR: armR.shoulderCap,
      bicepsL: armL.biceps, bicepsR: armR.biceps,
      tricepsL: armL.triceps, tricepsR: armR.triceps,
      forearmL: armL.forearm, forearmR: armR.forearm,
      thighL: legL.thigh, thighR: legR.thigh,
      shinL: legL.shin, shinR: legR.shin,
    },
  };
}

// Offset Y aplicado al root para que los pies queden al ras del suelo (y=0).
// El esqueleto mide 1.30 desde el root hasta la planta del pie (0.35 cadera + 0.5 muslo + 0.45 pierna),
// así que rootPos.y = 1.0 (parado) + 0.30 = 1.30 deja el pie en y=0.
const ROOT_Y_OFFSET = 0.30;

export function applyPose(joints, pose) {
  joints.root.position.set(pose.rootPos[0], pose.rootPos[1] + ROOT_Y_OFFSET, pose.rootPos[2]);
  joints.root.rotation.set(...pose.rootRot);
  joints.torso.rotation.set(...pose.torsoRot);
  joints.shoulderL.rotation.set(...pose.shoulderL);
  joints.shoulderR.rotation.set(...pose.shoulderR);
  joints.elbowL.rotation.set(...pose.elbowL);
  joints.elbowR.rotation.set(...pose.elbowR);
  joints.hipL.rotation.set(...pose.hipL);
  joints.hipR.rotation.set(...pose.hipR);
  joints.kneeL.rotation.set(...pose.kneeL);
  joints.kneeR.rotation.set(...pose.kneeR);
}

// Mezcla máxima del color de tinte (rojo) sobre el color base. 0.6 deja el
// músculo claramente rojizo en el pico de tensión sin saturarse.
const MAX_TINT = 0.6;

// Tiñe los meshes listados en `worksKeys` interpolando entre `baseColor` y
// `tintColor` según `tension` (0..1). Resetea el resto a `baseColor` para
// que no queden partes teñidas al cambiar de ejercicio.
export function applyTint(meshes, worksKeys, tension, baseColor, tintColor) {
  const worked = new Set(worksKeys);
  const factor = Math.max(0, Math.min(1, tension)) * MAX_TINT;
  for (const [key, mesh] of Object.entries(meshes)) {
    const c = mesh.material.color;
    if (worked.has(key)) {
      c.copy(baseColor).lerp(tintColor, factor);
    } else {
      c.copy(baseColor);
    }
  }
}
