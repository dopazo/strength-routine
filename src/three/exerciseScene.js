import * as THREE from 'three';
import { EXERCISES } from '../data/exercises.js';
import { POSES } from '../data/poses.js';
import { createDirector } from '../animation/director.js';
import { EASE } from '../animation/easing.js';
import { buildSkeleton, applyTint } from './skeleton.js';
import {
  applyRig, blendRig, copyRig, createRigPose, getScratchSkeleton, liveContacts,
  orientFoot, poseToRig, rigContacts, rigPosture, solveArm, solveLeg,
} from './rig.js';
import { createBandSystem } from './bandRenderer.js';
import { createCameraRig } from './cameraRig.js';

const BG = 0x100f0c;
const BODY_COLOR = 0xd5cdbd;
const TINT_COLOR = 0xe8501f;
const SIDES = ['L', 'R'];

// Duraciones de las mezclas automáticas entre poses.
const XFADE_SEC = 0.6;
const XFADE_FLOOR_STEP = 0.85;
// Poses intermedias para bajar al suelo o levantarse sin atravesar el piso.
const VIA_TO_FLOOR = ['crouchLow', 'sitFloor'];
const VIA_TO_STAND = ['sitFloor', 'crouchLow'];

const resolvePose = (p) => (typeof p === 'string' ? POSES[p] : p);
const TAU = Math.PI * 2;
const X_AXIS = new THREE.Vector3(1, 0, 0);
const Y_AXIS = new THREE.Vector3(0, 1, 0);

function makeFloorGlow() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d');
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,236,205,0.55)');
  grad.addColorStop(0.45, 'rgba(255,236,205,0.18)');
  grad.addColorStop(1, 'rgba(255,236,205,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function rigJump(a, b, limit) {
  if (a.rootPos.distanceToSquared(b.rootPos) > 0.01) return true;
  for (const j in a.q) {
    if (a.q[j].angleTo(b.q[j]) > limit) return true;
  }
  return false;
}

const cloneVecs = (arr) => arr.map((v) => v.clone());

// Crea la escena 3D del visor dentro de `container`.
// `onFrame(info)` se llama cada frame con datos para el HUD.
export function createExerciseScene(container, { onFrame } = {}) {
  let width = container.clientWidth || 1;
  let height = container.clientHeight || 1;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.style.display = 'block';
  canvas.style.touchAction = 'none';
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(BG, 6.5, 13);
  const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 60);

  // --- Luces: cenital cálida con sombras, contraluz frío y relleno suave.
  scene.add(new THREE.HemisphereLight(0xfff1dc, 0x24201a, 1.05));
  const key = new THREE.DirectionalLight(0xfff3e2, 2.3);
  key.position.set(2.4, 5.2, 3.4);
  key.target.position.set(0, 0.7, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -1.9, right: 1.9, top: 1.9, bottom: -1.9, near: 1, far: 14 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.025;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xa9bdff, 1.3);
  rim.position.set(-3.2, 3.4, -4);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffd9b3, 0.45);
  fill.position.set(-4, 1.6, 3);
  scene.add(fill);

  // --- Suelo: disco oscuro, grilla que se funde con la niebla, halo bajo el
  // muñeco y un plano que solo recibe sombras.
  const floorMat = new THREE.MeshBasicMaterial({ color: 0x18160f });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(9, 64), floorMat);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const grid = new THREE.GridHelper(18, 36, 0x302b22, 0x24211a);
  grid.position.y = 0.001;
  scene.add(grid);
  const glowTex = makeFloorGlow();
  const glowMat = new THREE.MeshBasicMaterial({
    map: glowTex, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), glowMat);
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.0015;
  scene.add(glow);
  const shadowMat = new THREE.ShadowMaterial({ opacity: 0.42 });
  const shadowCatcher = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), shadowMat);
  shadowCatcher.rotation.x = -Math.PI / 2;
  shadowCatcher.position.y = 0.002;
  shadowCatcher.receiveShadow = true;
  scene.add(shadowCatcher);

  // --- Muñeco, bandas y cámara.
  const bodyMat = new THREE.MeshStandardMaterial({ color: BODY_COLOR, roughness: 0.58, metalness: 0.02 });
  const joints = buildSkeleton(scene, bodyMat);
  const baseColor = new THREE.Color(BODY_COLOR);
  const tintColor = new THREE.Color(TINT_COLOR);
  const tintLevels = {};
  const bands = createBandSystem(scene);
  const cameraRig = createCameraRig(camera, canvas);

  const director = createDirector();

  // --- Estado de la animación.
  let ctx = { phase: 'demo', exerciseId: Object.keys(EXERCISES)[0], phaseKey: 'init', phaseElapsed: 0 };
  let paused = false;
  let clock = 0;
  let synced = 0;
  let syncAt = performance.now();
  let animTime = 0;
  let restWeight = 0;

  const targetRig = createRigPose();
  const prevTargetRig = createRigPose();
  const displayRig = createRigPose();
  const workRig = createRigPose();
  let hasPrevTarget = false;
  let lastKey = '';
  let displayExercise = null;
  let xfade = null;
  // Último pose mostrado (antes de secundarios e IK): punto de partida de la
  // siguiente mezcla.
  const snapshot = { rig: createRigPose(), feet: null, hands: null, handsW: 0 };

  const display = {
    feet: [new THREE.Vector3(), new THREE.Vector3()],
    hands: [new THREE.Vector3(), new THREE.Vector3()],
    handsW: 0,
  };

  function setContext(next) {
    if (next.phaseKey !== ctx.phaseKey) clock = next.phaseElapsed ?? 0;
    if (next.camera && next.camera !== ctx.camera) cameraRig.setView(next.camera, { immediate: true });
    synced = next.phaseElapsed ?? 0;
    syncAt = performance.now();
    ctx = next;
  }

  function setPaused(p) {
    paused = p;
    syncAt = performance.now();
  }

  // Reloj suave sincronizado con el temporizador del reducer (que avanza a
  // saltos de 100 ms): avanza con el frame y corrige la deriva con suavidad.
  function advanceClock(dt, now) {
    if (ctx.fixedTime != null) {
      clock = ctx.fixedTime;
      return;
    }
    if (!paused) clock += dt;
    const target = synced + (paused ? 0 : Math.min((now - syncAt) / 1000, 0.25));
    const err = target - clock;
    if (Math.abs(err) > 0.4) clock = target;
    else clock += err * (1 - Math.exp(-dt * 3));
  }

  function startCrossfade() {
    const from = { rig: copyRig(snapshot.rig), feet: cloneVecs(snapshot.feet), hands: cloneVecs(snapshot.hands), handsW: snapshot.handsW };
    const chain = [from];
    const fromPosture = rigPosture(from.rig);
    const toPosture = rigPosture(targetRig);
    if (fromPosture !== toPosture) {
      for (const id of toPosture === 'floor' ? VIA_TO_FLOOR : VIA_TO_STAND) {
        const rig = poseToRig(POSES[id]);
        const c = rigContacts(rig);
        chain.push({ rig, feet: c.feet, hands: c.hands, handsW: 0 });
      }
    }
    xfade = { chain, start: animTime, step: chain.length > 1 ? XFADE_FLOOR_STEP : XFADE_SEC };
  }

  const _lift = new THREE.Vector3();
  function blendContacts(a, b, k, out, lift) {
    for (let i = 0; i < 2; i++) {
      out[i].lerpVectors(a[i], b[i], k);
      if (lift) {
        // Si el pie cambia de lugar, se levanta en arco (da un paso).
        const d = _lift.subVectors(a[i], b[i]).length();
        if (d > 0.03) out[i].y += Math.sin(Math.PI * k) * Math.min(0.12, d * 0.45);
      }
    }
  }

  // Pose final a mostrar este frame (con la mezcla automática si la hay).
  function resolveDisplay(target) {
    if (!xfade) {
      copyRig(targetRig, displayRig);
      for (let i = 0; i < 2; i++) {
        display.feet[i].copy(target.feet[i]);
        display.hands[i].copy(target.hands[i]);
      }
      display.handsW = target.handsW;
      return;
    }
    const e = (animTime - xfade.start) / xfade.step;
    if (e >= xfade.chain.length) {
      xfade = null;
      resolveDisplay(target);
      return;
    }
    const i = Math.floor(e);
    const k = EASE.transition(e - i);
    const a = xfade.chain[i];
    const b = i + 1 < xfade.chain.length ? xfade.chain[i + 1] : { rig: targetRig, ...target };
    blendRig(a.rig, b.rig, k, displayRig);
    blendContacts(a.feet, b.feet, k, display.feet, true);
    blendContacts(a.hands, b.hands, k, display.hands, false);
    display.handsW = THREE.MathUtils.lerp(a.handsW, b.handsW, k);
  }

  // Movimientos secundarios: respiración, balanceo de peso y mirada en el
  // descanso. Se suman encima de la pose (los pies siguen fijos por la IK).
  const _q = new THREE.Quaternion();
  function addSecondary(src, out) {
    copyRig(src, out);
    const t = animTime;
    const rate = 0.25 + 0.1 * (1 - restWeight);
    const breath = Math.sin(t * TAU * rate);
    out.q.thoracic.multiply(_q.setFromAxisAngle(X_AXIS, -0.022 * breath));
    out.q.neck.multiply(_q.setFromAxisAngle(X_AXIS, 0.014 * breath));
    if (rigPosture(src) === 'stand') {
      const sway = 0.3 + 0.7 * restWeight;
      out.rootPos.x += 0.011 * sway * Math.sin((t * TAU) / 5.7);
      out.rootPos.z += 0.006 * sway * Math.sin((t * TAU) / 7.3 + 1);
      out.q.root.premultiply(_q.setFromAxisAngle(Y_AXIS, 0.03 * restWeight * Math.sin((t * TAU) / 9.1)));
      out.q.neck.multiply(_q.setFromAxisAngle(Y_AXIS, 0.2 * restWeight * Math.sin((t * TAU) / 10.3)));
      out.q.shoulderL.multiply(_q.setFromAxisAngle(X_AXIS, 0.035 * restWeight * Math.sin((t * TAU) / 5.7 + 0.6)));
      out.q.shoulderR.multiply(_q.setFromAxisAngle(X_AXIS, 0.035 * restWeight * Math.sin((t * TAU) / 5.7 + 2.1)));
    }
    return breath;
  }

  function setDisplayExercise(exerciseId) {
    const first = displayExercise == null;
    displayExercise = exerciseId;
    const ex = EXERCISES[exerciseId];
    const sk = getScratchSkeleton();
    const forEachPose = (cb) => {
      for (const id of new Set(ex.keyframes)) {
        applyRig(sk, poseToRig(POSES[id]));
        cb(sk);
      }
    };
    const delay = xfade ? xfade.chain.length * xfade.step * 0.6 : 0;
    bands.setExercise(exerciseId, ex.band, forEachPose, { immediate: first, delay });
    cameraRig.setView(ctx.camera ?? ex.camera, { immediate: first || Boolean(ctx.camera) });
  }

  const target = {
    feet: null, hands: null, handsW: 0,
  };
  const pathHands = [new THREE.Vector3(), new THREE.Vector3()];
  const _arc = new THREE.Vector3();

  function frame(dt, now) {
    // La pausa congela el reloj del ejercicio (la repetición queda detenida),
    // pero mezclas, respiración y física siguen corriendo: si el usuario salta
    // de fase en pausa, el muñeco igual llega a la nueva pose.
    advanceClock(dt, now);
    const animDt = dt;
    animTime += animDt;

    const out = director(ctx, clock);
    const ex = EXERCISES[out.exerciseId];

    // 1. Pose objetivo y contactos: los pies quedan fijos donde los pone la
    // pose ancla; las manos quedan fijas (`plantHands`) o siguen una línea
    // recta entre keyframes (`handPath`, p. ej. el woodchopper).
    const fromRig = poseToRig(resolvePose(out.from));
    const toRig = poseToRig(resolvePose(out.to));
    blendRig(fromRig, toRig, out.k, targetRig);
    const anchor = rigContacts(poseToRig(resolvePose(out.anchor)));
    target.feet = anchor.feet;
    if (ex.plantHands) {
      target.hands = anchor.hands;
      target.handsW = 1;
    } else if (ex.handPath) {
      const ha = rigContacts(fromRig).hands;
      const hb = rigContacts(toRig).hands;
      // Arco opcional (p. ej. hacia adelante) para que los brazos no se
      // recojan a mitad de camino.
      const arc = Math.sin(Math.PI * out.k);
      for (let i = 0; i < 2; i++) {
        pathHands[i].lerpVectors(ha[i], hb[i], out.k);
        if (ex.handPath.arc) pathHands[i].addScaledVector(_arc.fromArray(ex.handPath.arc), arc);
      }
      target.hands = pathHands;
      target.handsW = 1;
    } else {
      target.hands = anchor.hands;
      target.handsW = 0;
    }

    // 2. Mezcla automática ante cualquier salto (cambio de fase, de ejercicio,
    // saltos del usuario…).
    const key = `${ctx.phaseKey}|${out.mode}|${out.exerciseId}`;
    const exerciseChanged = out.exerciseId !== displayExercise;
    if (hasPrevTarget && (key !== lastKey || exerciseChanged || rigJump(targetRig, prevTargetRig, 0.3 + 8 * dt))) {
      startCrossfade();
    }
    lastKey = key;
    copyRig(targetRig, prevTargetRig);
    if (exerciseChanged) setDisplayExercise(out.exerciseId);
    if (!hasPrevTarget) {
      snapshot.feet = cloneVecs(target.feet);
      snapshot.hands = cloneVecs(target.hands);
    }
    hasPrevTarget = true;

    resolveDisplay(target);
    copyRig(displayRig, snapshot.rig);
    for (let i = 0; i < 2; i++) {
      snapshot.feet[i].copy(display.feet[i]);
      snapshot.hands[i].copy(display.hands[i]);
    }
    snapshot.handsW = display.handsW;

    // 3. Secundarios + aplicar al esqueleto + IK.
    const restTarget = out.mode === 'rest' ? 1 : 0;
    restWeight += (restTarget - restWeight) * (1 - Math.exp(-animDt * 1.5));
    const breath = addSecondary(displayRig, workRig);
    applyRig(joints, workRig);
    SIDES.forEach((s, i) => {
      solveLeg(joints, s, display.feet[i]);
      orientFoot(joints, s);
    });
    if (display.handsW > 0.001) {
      SIDES.forEach((s, i) => solveArm(joints, s, display.hands[i], display.handsW));
    }
    const chestScale = 1 + 0.03 * breath;
    joints.meshes.chest.scale.z = chestScale;
    joints.meshes.upperBack.scale.z = 1 + 0.015 * breath;

    // 4. Banda (física) y tinte muscular.
    bands.update(animDt, joints, camera.position);
    const works = ex.works ?? [];
    const tintRate = 1 - Math.exp(-animDt * 6);
    for (const k of Object.keys(joints.meshes)) {
      const goal = works.includes(k) ? out.activation : 0;
      const cur = tintLevels[k] ?? 0;
      tintLevels[k] = cur + (goal - cur) * tintRate;
    }
    applyTint(joints.meshes, tintLevels, baseColor, tintColor);

    // 5. Cámara y render.
    cameraRig.update(dt, now / 1000);
    renderer.render(scene, camera);
    onFrame?.({ hud: out.hud, mode: out.mode, exerciseId: out.exerciseId });
  }

  let raf = 0;
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    frame(dt, now);
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);

  const ro = new ResizeObserver(() => {
    width = container.clientWidth || 1;
    height = container.clientHeight || 1;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  });
  ro.observe(container);

  function dispose() {
    cancelAnimationFrame(raf);
    ro.disconnect();
    cameraRig.dispose();
    bands.dispose();
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
    for (const m of joints.allMeshes) if (m.material !== bodyMat) m.material.dispose();
    [bodyMat, floorMat, glowMat, shadowMat, grid.material].forEach((m) => m.dispose());
    glowTex.dispose();
    renderer.dispose();
    if (canvas.parentNode === container) container.removeChild(canvas);
  }

  return { setContext, setPaused, dispose, cameraRig, joints, liveContacts: () => liveContacts(joints) };
}
