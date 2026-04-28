import * as THREE from 'three';

function getWorld(obj) {
  const v = new THREE.Vector3();
  obj.getWorldPosition(v);
  return v;
}

// Mantiene el material y las geometrías de la banda; expone render/dispose
// para reutilizar el mismo material entre frames y limpiar recursos al desmontar.
export function createBandRenderer(scene) {
  const bandMat = new THREE.MeshStandardMaterial({ color: 0x84cc16, roughness: 0.4 });
  const anchorMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.8 });
  const anchorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), anchorMat);
  anchorMesh.visible = false;
  scene.add(anchorMesh);

  const meshes = [];

  function clear() {
    while (meshes.length) {
      const m = meshes.pop();
      scene.remove(m);
      m.geometry.dispose();
    }
  }

  function drawSegment(a, b, naturalLength) {
    const dist = a.distanceTo(b);
    const stretch = dist / naturalLength;
    const sag = Math.max(0, 1 - stretch) * 0.25;
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    mid.y -= sag;
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    // Color: lima (relajada) → rojo (muy estirada)
    const tension = Math.min(1, Math.max(0, (stretch - 1) * 1.5));
    bandMat.color.setRGB(
      0.52 + tension * 0.4,
      0.8 - tension * 0.55,
      0.1 + tension * 0.05,
    );
    const tube = new THREE.TubeGeometry(curve, 18, 0.022, 6, false);
    const mesh = new THREE.Mesh(tube, bandMat);
    scene.add(mesh);
    meshes.push(mesh);
  }

  function render(exercise, joints) {
    clear();
    const cfg = exercise.band;
    anchorMesh.visible = false;
    if (cfg.type === 'handToHand') {
      drawSegment(getWorld(joints.handL), getWorld(joints.handR), cfg.naturalLength);
    } else if (cfg.type === 'footToHand_dual') {
      drawSegment(getWorld(joints.footL), getWorld(joints.handL), cfg.naturalLength);
      drawSegment(getWorld(joints.footR), getWorld(joints.handR), cfg.naturalLength);
    } else if (cfg.type === 'overhead_to_feet') {
      const handMid = getWorld(joints.handL).add(getWorld(joints.handR)).multiplyScalar(0.5);
      const feetMid = getWorld(joints.footL).add(getWorld(joints.footR)).multiplyScalar(0.5);
      drawSegment(handMid, feetMid, cfg.naturalLength);
    } else if (cfg.type === 'oneFoot_to_handMid') {
      const foot = cfg.foot === 'L' ? joints.footL : joints.footR;
      const handMid = getWorld(joints.handL).add(getWorld(joints.handR)).multiplyScalar(0.5);
      drawSegment(getWorld(foot), handMid, cfg.naturalLength);
    } else if (cfg.type === 'anchored_side') {
      const anchor = new THREE.Vector3(...cfg.anchorPos);
      anchorMesh.position.copy(anchor);
      anchorMesh.visible = true;
      const handMid = getWorld(joints.handL).add(getWorld(joints.handR)).multiplyScalar(0.5);
      drawSegment(anchor, handMid, cfg.naturalLength);
    }
  }

  function dispose() {
    clear();
    scene.remove(anchorMesh);
    anchorMesh.geometry.dispose();
    bandMat.dispose();
    anchorMat.dispose();
  }

  return { render, dispose };
}
