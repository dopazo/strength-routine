import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Banda elástica plana.
// Cada tramo libre de la banda es una cuerda simulada con integración de
// Verlet: partículas unidas por restricciones de distancia que solo actúan al
// estirarse (una banda floja se pandea, no empuja). Hay gravedad, roce con el
// suelo y colisión contra cápsulas del cuerpo (muslos, piernas, torso), así
// que la banda floja cuelga o queda en el piso y la tensa se apoya sobre el
// cuerpo en vez de atravesarlo. Se dibuja como una cinta (ribbon) cuyas
// geometrías se crean una sola vez y solo se actualizan sus vértices.
// ---------------------------------------------------------------------------

const BAND_W = 0.074;       // ancho de la cinta sin estirar
const HAND_W = 0.032;       // ancho donde la mano la recoge en el puño
const THICK = 0.004;        // separación mínima del suelo
const SEGMENTS = 24;        // tramos por cuerda simulada
const SUBDIV = 2;           // subdivisión Catmull-Rom para el mallado
const STEP = 1 / 120;       // paso fijo de la simulación
const MAX_STEPS = 5;
const ITERATIONS = 14;
const GRAVITY = -9.8;
const DAMPING = 0.982;
const FLOOR_FRICTION = 0.35;
const BEND_MIN = 1.55;       // distancia mínima i↔i+2 (en largos de tramo)
const BEND_STIFFNESS = 0.35;

const COLOR_SLACK = new THREE.Color('#A3D125');
const COLOR_MID = new THREE.Color('#E0A03A');
const COLOR_TAUT = new THREE.Color('#E8501F');

const UP = new THREE.Vector3(0, 1, 0);
const FRONT = new THREE.Vector3(0, 0, 1);
// Posición de la cámara: la cara ancha de la cinta tiende a mirarla un poco
// para que la banda se lea bien aunque se vea de costado.
const viewPos = new THREE.Vector3(0, 1.5, 4);
const _toCam = new THREE.Vector3();

function tensionColor(stretch, out) {
  const f = THREE.MathUtils.clamp((stretch - 1) / 0.6, 0, 1);
  if (f < 0.5) return out.copy(COLOR_SLACK).lerp(COLOR_MID, f * 2);
  return out.copy(COLOR_MID).lerp(COLOR_TAUT, (f - 0.5) * 2);
}

// ---------------------------------------------------------------------------
// Disposición: dónde se fija cada tramo según `exercise.band.type`.
// Escribe en vectores preasignados para no crear objetos por frame.
// ---------------------------------------------------------------------------

const ARC_POINTS = 9;

function createLayout(cfg) {
  const v = () => new THREE.Vector3();
  const ropes = [];
  const strips = [];
  const rope = (aKind, bKind) => {
    const r = { a: v(), b: v(), aKind, bKind };
    ropes.push(r);
    return r;
  };
  const strip = (n, onFloor) => {
    const s = { points: Array.from({ length: n }, v), onFloor };
    strips.push(s);
    return s;
  };
  const tmp = v();
  const mid = (o1, o2, out) => {
    o1.getWorldPosition(out);
    o2.getWorldPosition(tmp);
    return out.add(tmp).multiplyScalar(0.5);
  };

  let update;
  switch (cfg.type) {
    case 'handToHand': {
      const r = rope('hand', 'hand');
      update = (j) => {
        j.handL.getWorldPosition(r.a);
        j.handR.getWorldPosition(r.b);
      };
      break;
    }
    case 'footToHand_dual': {
      // Se pisa el centro de la banda: un tramo bajo ambos pies y un extremo
      // en cada mano.
      const rl = rope('foot', 'hand');
      const rr = rope('foot', 'hand');
      const floor = strip(2, true);
      update = (j) => {
        j.soleOuterL.getWorldPosition(rl.a);
        j.handL.getWorldPosition(rl.b);
        j.soleOuterR.getWorldPosition(rr.a);
        j.handR.getWorldPosition(rr.b);
        floor.points[0].copy(rl.a);
        floor.points[1].copy(rr.a);
      };
      break;
    }
    case 'overhead_to_feet': {
      const r = rope('foot', 'hand');
      const floor = strip(2, true);
      update = (j) => {
        mid(j.footL, j.footR, r.a);
        mid(j.handL, j.handR, r.b);
        j.soleOuterL.getWorldPosition(floor.points[0]);
        j.soleOuterR.getWorldPosition(floor.points[1]);
      };
      break;
    }
    case 'oneFoot_to_handMid': {
      const r = rope('foot', 'hand');
      const foot = cfg.foot === 'R' ? 'footR' : 'footL';
      update = (j) => {
        j[foot].getWorldPosition(r.a);
        mid(j.handL, j.handR, r.b);
      };
      break;
    }
    case 'handToHand_overHip': {
      // La banda cruza por encima de la pelvis (arco pegado al cuerpo) y cada
      // extremo baja hasta una mano apoyada en el suelo.
      const arc = strip(ARC_POINTS, false);
      const rl = rope('hand', 'body');
      const rr = rope('body', 'hand');
      const local = Array.from({ length: ARC_POINTS }, (_, i) => {
        const a = -Math.PI / 2 + (Math.PI * i) / (ARC_POINTS - 1);
        return new THREE.Vector3(0.172 * Math.sin(a), 0.02, 0.122 * Math.cos(a));
      });
      update = (j) => {
        j.lumbar.updateWorldMatrix(true, false);
        local.forEach((p, i) => arc.points[i].copy(p).applyMatrix4(j.lumbar.matrixWorld));
        j.handL.getWorldPosition(rl.a);
        rl.b.copy(arc.points[0]);
        rr.a.copy(arc.points[ARC_POINTS - 1]);
        j.handR.getWorldPosition(rr.b);
      };
      break;
    }
    case 'anchored_side': {
      const r = rope('anchor', 'hand');
      const anchor = new THREE.Vector3(...cfg.anchorPos);
      update = (j) => {
        r.a.copy(anchor);
        mid(j.handL, j.handR, r.b);
      };
      break;
    }
    default:
      update = () => {};
  }
  return { ropes, strips, update };
}

// ---------------------------------------------------------------------------
// Cuerda simulada
// ---------------------------------------------------------------------------

class Rope {
  constructor(naturalLength) {
    this.n = SEGMENTS;
    this.natural = naturalLength;
    this.rest = naturalLength / SEGMENTS;
    this.p = new Float32Array((SEGMENTS + 1) * 3);
    this.o = new Float32Array((SEGMENTS + 1) * 3);
    this.ready = false;
    this.length = naturalLength;
  }

  // Coloca las partículas en una parábola entre a y b (con la flecha que
  // corresponde al largo sobrante) y un leve desvío hacia el frente del cuerpo.
  reset(a, b) {
    const { n, p, o } = this;
    const chord = a.distanceTo(b);
    const slack = Math.max(0, this.natural - chord);
    const sag = Math.sqrt((3 * Math.max(chord, 0.05) * slack) / 8);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const bump = 4 * t * (1 - t);
      const ix = i * 3;
      p[ix] = a.x + (b.x - a.x) * t;
      p[ix + 1] = Math.max(THICK, a.y + (b.y - a.y) * t - sag * bump);
      p[ix + 2] = a.z + (b.z - a.z) * t + 0.05 * bump;
    }
    o.set(p);
    this.ready = true;
  }

  pin(a, b) {
    const { p, o, n } = this;
    const e = n * 3;
    p[0] = o[0] = a.x; p[1] = o[1] = a.y; p[2] = o[2] = a.z;
    p[e] = o[e] = b.x; p[e + 1] = o[e + 1] = b.y; p[e + 2] = o[e + 2] = b.z;
  }

  step(a, b, h, colliders) {
    const { p, o, n, rest } = this;
    const g = GRAVITY * h * h;
    for (let i = 1; i < n; i++) {
      const ix = i * 3;
      for (let c = 0; c < 3; c++) {
        const cur = p[ix + c];
        const vel = (cur - o[ix + c]) * DAMPING;
        o[ix + c] = cur;
        p[ix + c] = cur + vel;
      }
      p[ix + 1] += g;
    }
    this.pin(a, b);

    for (let it = 0; it < ITERATIONS; it++) {
      const forward = (it & 1) === 0;
      for (let s = 0; s < n; s++) {
        const i = forward ? s : n - 1 - s;
        const ix = i * 3;
        const jx = ix + 3;
        const dx = p[jx] - p[ix];
        const dy = p[jx + 1] - p[ix + 1];
        const dz = p[jx + 2] - p[ix + 2];
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d <= rest || d < 1e-9) continue;
        const diff = (d - rest) / d;
        const wi = i === 0 ? 0 : i + 1 === n ? 1 : 0.5;
        const wj = i + 1 === n ? 0 : i === 0 ? 1 : 0.5;
        p[ix] += dx * diff * wi; p[ix + 1] += dy * diff * wi; p[ix + 2] += dz * diff * wi;
        p[jx] -= dx * diff * wj; p[jx + 1] -= dy * diff * wj; p[jx + 2] -= dz * diff * wj;
      }
      this.stiffen();
      this.collide(colliders);
    }

    // Roce con el suelo: lo que toca el piso pierde casi toda su velocidad
    // horizontal, así la banda no patina.
    for (let i = 1; i < n; i++) {
      const ix = i * 3;
      if (p[ix + 1] <= THICK + 1e-4) {
        o[ix] = p[ix] - (p[ix] - o[ix]) * FLOOR_FRICTION;
        o[ix + 2] = p[ix + 2] - (p[ix + 2] - o[ix + 2]) * FLOOR_FRICTION;
      }
    }
  }

  // Rigidez a la flexión: impide que la cinta se doble sobre sí misma en
  // zigzag (separa partículas i e i+2 demasiado cercanas). Así lo que sobra de
  // una banda floja forma curvas amplias y se extiende por el suelo.
  stiffen() {
    const { p, n, rest } = this;
    const minD = rest * BEND_MIN;
    for (let i = 0; i + 2 <= n; i++) {
      const ix = i * 3;
      const kx = ix + 6;
      const dx = p[kx] - p[ix];
      const dy = p[kx + 1] - p[ix + 1];
      const dz = p[kx + 2] - p[ix + 2];
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d >= minD || d < 1e-9) continue;
      const diff = ((d - minD) / d) * BEND_STIFFNESS;
      const wi = i === 0 ? 0 : i + 2 === n ? 1 : 0.5;
      const wk = i + 2 === n ? 0 : i === 0 ? 1 : 0.5;
      p[ix] += dx * diff * wi; p[ix + 1] += dy * diff * wi; p[ix + 2] += dz * diff * wi;
      p[kx] -= dx * diff * wk; p[kx + 1] -= dy * diff * wk; p[kx + 2] -= dz * diff * wk;
    }
  }

  collide(colliders) {
    const { p, n } = this;
    for (let i = 1; i < n; i++) {
      const ix = i * 3;
      let x = p[ix];
      let y = p[ix + 1];
      let z = p[ix + 2];
      for (let c = 0; c < colliders.length; c++) {
        const col = colliders[c];
        const abx = col.bx - col.ax;
        const aby = col.by - col.ay;
        const abz = col.bz - col.az;
        const len2 = abx * abx + aby * aby + abz * abz;
        let t = len2 > 0 ? ((x - col.ax) * abx + (y - col.ay) * aby + (z - col.az) * abz) / len2 : 0;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const cx = col.ax + abx * t;
        const cy = col.ay + aby * t;
        const cz = col.az + abz * t;
        const dx = x - cx;
        const dy = y - cy;
        const dz = z - cz;
        const d2 = dx * dx + dy * dy + dz * dz;
        const r = col.r + 0.006;
        if (d2 < r * r && d2 > 1e-10) {
          const s = r / Math.sqrt(d2);
          x = cx + dx * s;
          y = cy + dy * s;
          z = cz + dz * s;
        }
      }
      if (y < THICK) y = THICK;
      p[ix] = x;
      p[ix + 1] = y;
      p[ix + 2] = z;
    }
  }

  measure() {
    const { p, n } = this;
    let L = 0;
    for (let i = 0; i < n; i++) {
      const ix = i * 3;
      const dx = p[ix + 3] - p[ix];
      const dy = p[ix + 4] - p[ix + 1];
      const dz = p[ix + 5] - p[ix + 2];
      L += Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    this.length = L;
    return L / this.natural;
  }
}

// ---------------------------------------------------------------------------
// Cinta: malla de doble cara con vértices actualizables.
// ---------------------------------------------------------------------------

const MAX_SAMPLES = SEGMENTS * SUBDIV + 1;
const _c = new THREE.Vector3();
const _t = new THREE.Vector3();
const _w = new THREE.Vector3();
const _cand = new THREE.Vector3();
const _pref = new THREE.Vector3();
const _nrm = new THREE.Vector3();

class Ribbon {
  constructor(material, maxSamples = MAX_SAMPLES) {
    this.max = maxSamples;
    this.centers = new Float32Array(maxSamples * 3);
    this.widths = new Float32Array(maxSamples);
    const geo = new THREE.BufferGeometry();
    this.pos = new THREE.BufferAttribute(new Float32Array(maxSamples * 6), 3);
    this.nor = new THREE.BufferAttribute(new Float32Array(maxSamples * 6), 3);
    this.pos.setUsage(THREE.DynamicDrawUsage);
    this.nor.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.pos);
    geo.setAttribute('normal', this.nor);
    const idx = [];
    for (let i = 0; i < maxSamples - 1; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    geo.setIndex(idx);
    this.geometry = geo;
    this.mesh = new THREE.Mesh(geo, material);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = true;
    this.count = 0;
  }

  // Muestrea una curva Catmull-Rom sobre los puntos (Float32Array xyz).
  setFromPoints(src, nPoints, subdiv) {
    const out = this.centers;
    let k = 0;
    const get = (i, c) => src[Math.min(nPoints - 1, Math.max(0, i)) * 3 + c];
    for (let i = 0; i < nPoints - 1; i++) {
      for (let s = 0; s < subdiv; s++) {
        const t = s / subdiv;
        const t2 = t * t;
        const t3 = t2 * t;
        for (let c = 0; c < 3; c++) {
          const p0 = get(i - 1, c);
          const p1 = get(i, c);
          const p2 = get(i + 1, c);
          const p3 = get(i + 2, c);
          out[k * 3 + c] = 0.5 * ((2 * p1) + (-p0 + p2) * t
            + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
        }
        k++;
      }
    }
    for (let c = 0; c < 3; c++) out[k * 3 + c] = src[(nPoints - 1) * 3 + c];
    this.count = k + 1;
  }

  setFromVectors(points, samplesPerSpan, floorY = null) {
    const out = this.centers;
    let k = 0;
    for (let i = 0; i < points.length - 1; i++) {
      for (let s = 0; s < samplesPerSpan; s++) {
        _c.lerpVectors(points[i], points[i + 1], s / samplesPerSpan);
        if (floorY != null) _c.y = floorY;
        _c.toArray(out, k * 3);
        k++;
      }
    }
    _c.copy(points[points.length - 1]);
    if (floorY != null) _c.y = floorY;
    _c.toArray(out, k * 3);
    this.count = k + 1;
  }

  // Ancho a lo largo de la cinta: angosta donde la mano la recoge y algo más
  // delgada cuanto más estirada (la banda real se angosta al estirarse).
  computeWidths(stretch, aKind, bKind) {
    const { centers, widths, count } = this;
    const mid = BAND_W / Math.sqrt(Math.max(1, stretch));
    let total = 0;
    const acc = this._acc || (this._acc = new Float32Array(this.max));
    acc[0] = 0;
    for (let i = 1; i < count; i++) {
      const dx = centers[i * 3] - centers[i * 3 - 3];
      const dy = centers[i * 3 + 1] - centers[i * 3 - 2];
      const dz = centers[i * 3 + 2] - centers[i * 3 - 1];
      total += Math.sqrt(dx * dx + dy * dy + dz * dz);
      acc[i] = total;
    }
    const taper = Math.min(0.12, total * 0.5);
    for (let i = 0; i < count; i++) {
      let w = mid;
      const fromA = acc[i];
      const fromB = total - acc[i];
      if (aKind === 'hand' && fromA < taper) w = THREE.MathUtils.lerp(HAND_W, mid, smooth(fromA / taper));
      if (bKind === 'hand' && fromB < taper) w = THREE.MathUtils.lerp(HAND_W, mid, smooth(fromB / taper));
      widths[i] = w;
    }
  }

  fillWidths(w) {
    this.widths.fill(w, 0, this.count);
  }

  // Construye los vértices con un marco que se transporta a lo largo de la
  // curva (sin giros bruscos) y que tiende a mostrar la cara ancha hacia el
  // frente, o hacia arriba cuando la cinta toca el suelo.
  build() {
    const { centers, widths, count } = this;
    const pos = this.pos.array;
    const nor = this.nor.array;
    for (let i = 0; i < count; i++) {
      const i0 = Math.max(0, i - 1);
      const i1 = Math.min(count - 1, i + 1);
      _t.set(
        centers[i1 * 3] - centers[i0 * 3],
        centers[i1 * 3 + 1] - centers[i0 * 3 + 1],
        centers[i1 * 3 + 2] - centers[i0 * 3 + 2],
      );
      if (_t.lengthSq() < 1e-12) _t.copy(UP);
      _t.normalize();
      _c.fromArray(centers, i * 3);
      const floorF = THREE.MathUtils.clamp(1 - _c.y / 0.06, 0, 1);
      _toCam.subVectors(viewPos, _c).normalize();
      _pref.copy(FRONT).lerp(_toCam, 0.65).normalize().lerp(UP, floorF).normalize();
      _cand.crossVectors(_t, _pref);
      const strength = _cand.length();
      if (i === 0) {
        if (strength > 0.05) _w.copy(_cand).divideScalar(strength);
        else _w.crossVectors(_t, Math.abs(_t.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : UP).normalize();
      } else {
        _w.addScaledVector(_t, -_t.dot(_w));
        if (_w.lengthSq() < 1e-8) _w.crossVectors(_t, UP);
        _w.normalize();
        if (strength > 0.05) {
          _cand.divideScalar(strength);
          if (_cand.dot(_w) < 0) _cand.negate();
          _w.lerp(_cand, 0.3 * strength).normalize();
        }
      }
      _nrm.crossVectors(_w, _t).normalize();
      const hw = widths[i] * 0.5;
      const o = i * 6;
      pos[o] = _c.x + _w.x * hw; pos[o + 1] = _c.y + _w.y * hw; pos[o + 2] = _c.z + _w.z * hw;
      pos[o + 3] = _c.x - _w.x * hw; pos[o + 4] = _c.y - _w.y * hw; pos[o + 5] = _c.z - _w.z * hw;
      nor[o] = nor[o + 3] = _nrm.x;
      nor[o + 1] = nor[o + 4] = _nrm.y;
      nor[o + 2] = nor[o + 5] = _nrm.z;
    }
    this.geometry.setDrawRange(0, Math.max(0, count - 1) * 6);
    this.pos.needsUpdate = true;
    this.nor.needsUpdate = true;
  }

  dispose() {
    this.geometry.dispose();
  }
}

const smooth = (t) => t * t * (3 - 2 * t);

// ---------------------------------------------------------------------------
// Instancia de banda para un ejercicio (con fundido de entrada/salida).
// ---------------------------------------------------------------------------

function makeMaterial() {
  return new THREE.MeshStandardMaterial({
    color: COLOR_SLACK.clone(),
    roughness: 0.45,
    metalness: 0,
    side: THREE.DoubleSide,
  });
}

function createInstance(scene, exerciseId, cfg, forEachPose) {
  const layout = createLayout(cfg);
  // Largo natural: en el keyframe donde cada tramo queda más corto, la banda
  // está estirada `minStretch` veces (apenas tensa).
  const minDist = layout.ropes.map(() => Infinity);
  forEachPose((joints) => {
    layout.update(joints);
    layout.ropes.forEach((r, i) => { minDist[i] = Math.min(minDist[i], r.a.distanceTo(r.b)); });
  });
  const minStretch = cfg.minStretch ?? 1.05;
  const ropes = layout.ropes.map((r, i) => {
    const natural = cfg.naturalLength ?? Math.max(0.15, minDist[i] / minStretch);
    const sim = new Rope(natural);
    const material = makeMaterial();
    const ribbon = new Ribbon(material);
    scene.add(ribbon.mesh);
    return { ...r, sim, material, ribbon };
  });
  const stripMaterial = makeMaterial();
  const strips = layout.strips.map((s) => {
    const ribbon = new Ribbon(stripMaterial, 24);
    scene.add(ribbon.mesh);
    return { ...s, ribbon };
  });

  let anchorMesh = null;
  if (cfg.type === 'anchored_side') {
    anchorMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.16, 0.16),
      new THREE.MeshStandardMaterial({ color: 0x3a362e, roughness: 0.8 }),
    );
    anchorMesh.position.fromArray(cfg.anchorPos);
    anchorMesh.castShadow = true;
    scene.add(anchorMesh);
  }

  const color = new THREE.Color();
  const materials = [...ropes.map((r) => r.material), stripMaterial];
  const inst = {
    exerciseId,
    opacity: 0,
    target: 1,
    layout,
    update(dt, joints, colliders, steps) {
      layout.update(joints);
      let maxStretch = 0;
      for (const r of ropes) {
        if (!r.sim.ready) r.sim.reset(r.a, r.b);
        for (let s = 0; s < steps; s++) r.sim.step(r.a, r.b, STEP, colliders);
        if (steps === 0) r.sim.pin(r.a, r.b);
        const stretch = r.sim.measure();
        maxStretch = Math.max(maxStretch, stretch);
        r.ribbon.setFromPoints(r.sim.p, r.sim.n + 1, SUBDIV);
        r.ribbon.computeWidths(stretch, r.aKind, r.bKind);
        r.ribbon.build();
        r.material.color.copy(tensionColor(stretch, color));
      }
      for (const s of strips) {
        s.ribbon.setFromVectors(s.points, s.onFloor ? 6 : 2, s.onFloor ? THICK : null);
        s.ribbon.fillWidths(BAND_W / Math.sqrt(Math.max(1, maxStretch)));
        s.ribbon.build();
      }
      stripMaterial.color.copy(tensionColor(maxStretch, color));
      // Oculta del todo la banda invisible (si no, igual proyectaría sombra).
      const visible = this.opacity > 0.01;
      for (const r of ropes) r.ribbon.mesh.visible = visible;
      for (const s of strips) s.ribbon.mesh.visible = visible;
      if (anchorMesh) anchorMesh.visible = visible;
      const transparent = this.opacity < 0.995;
      for (const m of materials) {
        m.opacity = this.opacity;
        if (m.transparent !== transparent) {
          m.transparent = transparent;
          m.depthWrite = !transparent;
          m.needsUpdate = true;
        }
      }
      return maxStretch;
    },
    dispose() {
      for (const r of ropes) {
        scene.remove(r.ribbon.mesh);
        r.ribbon.dispose();
        r.material.dispose();
      }
      for (const s of strips) {
        scene.remove(s.ribbon.mesh);
        s.ribbon.dispose();
      }
      stripMaterial.dispose();
      if (anchorMesh) {
        scene.remove(anchorMesh);
        anchorMesh.geometry.dispose();
        anchorMesh.material.dispose();
      }
    },
  };
  return inst;
}

// ---------------------------------------------------------------------------
// Sistema de bandas: mantiene la banda del ejercicio visible y funde la
// anterior al cambiar de ejercicio.
// ---------------------------------------------------------------------------

export function createBandSystem(scene) {
  const instances = [];
  const colliders = [];
  const _a = new THREE.Vector3();
  const _b = new THREE.Vector3();
  let acc = 0;
  let lastStretch = 1;

  function syncColliders(joints) {
    joints.capsules.forEach((cap, i) => {
      cap.node.updateWorldMatrix(true, false);
      _a.copy(cap.a).applyMatrix4(cap.node.matrixWorld);
      _b.copy(cap.b).applyMatrix4(cap.node.matrixWorld);
      const c = colliders[i] || (colliders[i] = {});
      c.ax = _a.x; c.ay = _a.y; c.az = _a.z;
      c.bx = _b.x; c.by = _b.y; c.bz = _b.z;
      c.r = cap.r;
    });
    colliders.length = joints.capsules.length;
  }

  return {
    // Activa la banda de `exerciseId`. `forEachPose(cb)` llama a cb con un
    // esqueleto puesto en cada keyframe (para calcular el largo natural).
    // `delay`: segundos antes de empezar a mostrarla (p. ej. mientras el
    // cuerpo termina de cambiar de postura).
    setExercise(exerciseId, cfg, forEachPose, { immediate = false, delay = 0 } = {}) {
      const top = instances[instances.length - 1];
      if (top && top.exerciseId === exerciseId && top.target === 1) return;
      for (const inst of instances) inst.target = 0;
      const inst = createInstance(scene, exerciseId, cfg, forEachPose);
      if (immediate) inst.opacity = 1;
      else inst.delay = delay;
      instances.push(inst);
    },

    update(dt, joints, cameraPos) {
      if (cameraPos) viewPos.copy(cameraPos);
      syncColliders(joints);
      acc += dt;
      let steps = 0;
      while (acc >= STEP && steps < MAX_STEPS) {
        acc -= STEP;
        steps++;
      }
      if (steps === MAX_STEPS) acc = 0;
      const fadeIn = 1 - Math.exp(-dt * 6);
      const fadeOut = 1 - Math.exp(-dt * 10);
      for (let i = instances.length - 1; i >= 0; i--) {
        const inst = instances[i];
        if (inst.delay > 0) inst.delay -= dt;
        else inst.opacity += (inst.target - inst.opacity) * (inst.target ? fadeIn : fadeOut);
        if (inst.target === 1 && inst.opacity > 0.995) inst.opacity = 1;
        const stretch = inst.update(dt, joints, colliders, steps);
        if (inst.target === 1) lastStretch = stretch;
        if (inst.target === 0 && inst.opacity < 0.02) {
          inst.dispose();
          instances.splice(i, 1);
        }
      }
      return lastStretch;
    },

    dispose() {
      for (const inst of instances) inst.dispose();
      instances.length = 0;
    },
  };
}
