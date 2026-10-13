import * as THREE from 'three';

// Cámara orbital hecha a mano (sin OrbitControls): cada ejercicio define un
// encuadre (`exercise.camera`) y la cámara se desliza suavemente hacia él.
// El usuario puede orbitar arrastrando (mouse o un dedo) y hacer zoom con la
// rueda o pellizcando; su ajuste se mantiene hasta el próximo ejercicio.

export const DEFAULT_VIEW = { yaw: 0.5, pitch: 0.16, dist: 4.1, target: [0, 1.0, 0] };

const TAU = Math.PI * 2;
const PITCH_MIN = -0.05;
const PITCH_MAX = 1.25;
const DIST_MIN = 1.8;
const DIST_MAX = 8;

export function createCameraRig(camera, dom) {
  const goal = { yaw: 0, pitch: 0, dist: 0, tx: 0, ty: 0, tz: 0 };
  const cur = { yaw: 0, pitch: 0, dist: 0, tx: 0, ty: 0, tz: 0 };
  const user = { yaw: 0, pitch: 0, zoom: 1 };
  const pointers = new Map();
  let pinchDist = 0;
  let initialized = false;
  const reducedMotion = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  function setView(view = DEFAULT_VIEW, { resetUser = true, immediate = false } = {}) {
    const v = { ...DEFAULT_VIEW, ...view };
    goal.yaw = v.yaw;
    goal.pitch = v.pitch;
    goal.dist = v.dist;
    [goal.tx, goal.ty, goal.tz] = v.target;
    if (resetUser) {
      // Evita dar vueltas completas si el usuario había girado mucho.
      const total = cur.yaw;
      cur.yaw = total - TAU * Math.round((total - goal.yaw) / TAU);
      user.yaw = 0;
      user.pitch = 0;
      user.zoom = 1;
    }
    if (immediate || !initialized) {
      Object.assign(cur, goal);
      initialized = true;
    }
  }

  function onDown(e) {
    dom.setPointerCapture?.(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [p1, p2] = [...pointers.values()];
      pinchDist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
    }
  }

  function onMove(e) {
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    const next = { x: e.clientX, y: e.clientY };
    if (pointers.size === 1) {
      user.yaw -= (next.x - prev.x) * 0.01;
      const pitch = goal.pitch + user.pitch + (next.y - prev.y) * 0.006;
      user.pitch = THREE.MathUtils.clamp(pitch, PITCH_MIN, PITCH_MAX) - goal.pitch;
    }
    pointers.set(e.pointerId, next);
    if (pointers.size === 2) {
      const [p1, p2] = [...pointers.values()];
      const d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      if (pinchDist > 0 && d > 0) zoomBy(pinchDist / d);
      pinchDist = d;
    }
  }

  function onUp(e) {
    pointers.delete(e.pointerId);
    pinchDist = 0;
  }

  function zoomBy(f) {
    const dist = THREE.MathUtils.clamp(goal.dist * user.zoom * f, DIST_MIN, DIST_MAX);
    user.zoom = dist / goal.dist;
  }

  function onWheel(e) {
    e.preventDefault();
    zoomBy(Math.exp(e.deltaY * 0.0012));
  }

  dom.addEventListener('pointerdown', onDown);
  dom.addEventListener('pointermove', onMove);
  dom.addEventListener('pointerup', onUp);
  dom.addEventListener('pointercancel', onUp);
  dom.addEventListener('wheel', onWheel, { passive: false });

  const _target = new THREE.Vector3();

  function update(dt, time) {
    const dragging = pointers.size > 0;
    const rate = 1 - Math.exp(-dt * (dragging ? 14 : 2.6));
    // Leve deriva de la órbita para que la escena no se sienta estática.
    const drift = reducedMotion ? 0 : 0.055 * Math.sin((time * TAU) / 17);
    const yaw = goal.yaw + user.yaw + drift;
    const pitch = THREE.MathUtils.clamp(goal.pitch + user.pitch, PITCH_MIN, PITCH_MAX);
    const dist = goal.dist * user.zoom;
    cur.yaw += (yaw - cur.yaw) * rate;
    cur.pitch += (pitch - cur.pitch) * rate;
    cur.dist += (dist - cur.dist) * rate;
    cur.tx += (goal.tx - cur.tx) * rate;
    cur.ty += (goal.ty - cur.ty) * rate;
    cur.tz += (goal.tz - cur.tz) * rate;
    _target.set(cur.tx, cur.ty, cur.tz);
    const cp = Math.cos(cur.pitch);
    camera.position.set(
      cur.tx + cur.dist * cp * Math.sin(cur.yaw),
      cur.ty + cur.dist * Math.sin(cur.pitch),
      cur.tz + cur.dist * cp * Math.cos(cur.yaw),
    );
    camera.lookAt(_target);
  }

  function dispose() {
    dom.removeEventListener('pointerdown', onDown);
    dom.removeEventListener('pointermove', onMove);
    dom.removeEventListener('pointerup', onUp);
    dom.removeEventListener('pointercancel', onUp);
    dom.removeEventListener('wheel', onWheel);
  }

  return { setView, update, dispose };
}
