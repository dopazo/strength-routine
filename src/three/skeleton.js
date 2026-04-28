import * as THREE from 'three';

function makeBone(material, length, radius = 0.055) {
  const geo = new THREE.CylinderGeometry(radius, radius, length, 12);
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
  const upperArm = makeBone(material, 0.4);
  shoulder.add(upperArm);
  const elbow = new THREE.Group();
  elbow.position.y = -0.4;
  upperArm.add(elbow);
  const forearm = makeBone(material, 0.38);
  elbow.add(forearm);
  const hand = new THREE.Object3D();
  hand.position.y = -0.38;
  elbow.add(hand);
  return { shoulder, elbow, hand };
}

function buildLeg(parent, side, material) {
  const sx = side === 'L' ? -1 : 1;
  const hip = new THREE.Group();
  // Cadera ubicada respecto al root (mismo y que la base del torso, ancho de hombros / 2).
  hip.position.set(sx * 0.15, -0.35, 0);
  parent.add(hip);
  const thigh = makeBone(material, 0.5, 0.07);
  hip.add(thigh);
  const knee = new THREE.Group();
  knee.position.y = -0.5;
  thigh.add(knee);
  const shin = makeBone(material, 0.45, 0.06);
  knee.add(shin);
  const foot = new THREE.Object3D();
  foot.position.y = -0.45;
  knee.add(foot);
  return { hip, knee, foot };
}

// Construye un esqueleto jerárquico bajo `scene` y devuelve los nodos
// que cualquier pose puede manipular (los mismos keys que existen en POSES).
export function buildSkeleton(scene, material) {
  const root = new THREE.Group();
  scene.add(root);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.25), material);
  root.add(torso);

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
