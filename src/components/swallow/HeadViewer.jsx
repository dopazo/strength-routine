import React, { useEffect, useRef, useState } from 'react';
import { HeadSvg } from './HeadSvg.jsx';
import { LABELS, VIEWS } from '../../swallow/views.js';
import { SWALLOW_EXERCISES } from '../../data/swallowExercises.js';
import { lerpParams, sampleExercise } from '../../swallow/motion.js';
import { EASE } from '../../animation/easing.js';

const XFADE_MS = 450;

// Escribe el HUD directo en el DOM (cada frame, sin re-render de React) y
// solo cuando cambia algún valor.
function createWriter() {
  const last = {};
  return (el, key, prop, value) => {
    if (!el || last[key] === value) return;
    last[key] = value;
    if (prop === 'text') el.textContent = value;
    else el.style[prop] = value;
  };
}

// Lámina animada de la cabeza para los ejercicios de deglución.
//
// Props:
//   exerciseId — ejercicio (src/data/swallowExercises.js)
//   mode       — 'demo' (bucle) · 'rep' (repetición guiada) · 'work' (serie
//                por tiempo) · 'idle' (espera) · 'params' (pose fija, lab)
//   modeKey    — identifica el tramo actual; al cambiar, la lámina mezcla
//                suavemente desde lo que mostraba
//   clockStart — instante (Date.now) en que t = 0 del tramo; si falta, la
//                lámina lleva su propio reloj desde que cambió modeKey
//   pausedAt   — instante en que se pausó (congela el reloj)
//   duration   — duración de la serie en modo 'work'
//   params     — parámetros fijos (modo 'params')
//   fixedTime  — congela el tiempo (capturas del Head Lab)
//   initialView — vista inicial ('side' | 'front'); la persona puede cambiarla
// Tamaño de los rótulos de la lámina, en px de pantalla.
const LABEL_PX = 12.5;

export function HeadViewer({
  exerciseId = null, mode = 'demo', modeKey = '', clockStart = null, pausedAt = null, duration = 0,
  params = null, fixedTime = null, showHud = true, label = null, initialView = null,
}) {
  const ex = exerciseId ? SWALLOW_EXERCISES[exerciseId] : null;
  const views = ex?.views ?? Object.keys(VIEWS);
  const firstView = initialView && views.includes(initialView) ? initialView : views[0];
  const [view, setView] = useState(firstView);
  const hostRef = useRef(null);
  const svgRef = useRef(null);
  const hud = useRef({});
  const labelRefs = useRef({});
  const live = useRef({});
  live.current = { ex, exerciseId, mode, modeKey, clockStart, pausedAt, duration, params, fixedTime, view, views };

  // Al cambiar de ejercicio vuelve a su vista inicial.
  useEffect(() => {
    setView(firstView);
  }, [exerciseId, firstView]);

  useEffect(() => {
    const write = createWriter();
    const st = { key: '', own: performance.now(), shown: null, from: null, xstart: 0, mix: {}, first: true, scale: {} };
    const measure = () => {
      const host = hostRef.current;
      if (!host) return;
      const W = host.clientWidth || 1;
      const H = host.clientHeight || 1;
      for (const [name, v] of Object.entries(VIEWS)) {
        const s = Math.min(W / v.viewBox.w, H / v.viewBox.h);
        st.scale[name] = s;
      }
      st.dirtyFont = true;
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (hostRef.current) ro.observe(hostRef.current);

    let raf = 0;
    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const L = live.current;
      const key = `${L.exerciseId}|${L.mode}|${L.modeKey}`;
      if (key !== st.key) {
        st.key = key;
        st.own = now;
        if (st.shown) {
          st.from = st.shown;
          st.xstart = now;
        }
      }
      let t;
      if (L.fixedTime != null) t = L.fixedTime;
      else if (L.clockStart != null) t = ((L.pausedAt ?? Date.now()) - L.clockStart) / 1000;
      else t = (now - st.own) / 1000;

      const s = L.mode === 'params' || !L.ex
        ? { params: L.params ?? {}, cue: '' }
        : sampleExercise(L.exerciseId, L.ex, L.mode, t, { duration: L.duration });
      let p = s.params;
      if (st.from && L.fixedTime == null) {
        const k = (now - st.xstart) / XFADE_MS;
        if (k >= 1) st.from = null;
        else p = lerpParams(st.from, p, EASE.transition(k));
      }
      st.shown = p;

      // Mezcla entre vistas (fundido corto al cambiar de corte a frente).
      const rate = st.first ? 1 : 0.18;
      for (const name of Object.keys(VIEWS)) {
        const goal = name === L.view && L.views.includes(name) ? 1 : 0;
        const cur = st.mix[name] ?? goal;
        st.mix[name] = Math.abs(goal - cur) < 0.01 ? goal : cur + (goal - cur) * rate;
      }
      st.first = false;
      svgRef.current?.update(p, st.mix);

      // Rótulos de estructuras.
      const enabled = L.ex?.labels ?? {};
      for (const [name, v] of Object.entries(VIEWS)) {
        const specs = LABELS[name] ?? {};
        const anchors = st.mix[name] > 0.01 ? v.anchors(p) : null;
        const scale = st.scale[name] || 1;
        for (const [id, spec] of Object.entries(specs)) {
          const g = labelRefs.current[`${name}.${id}`];
          if (!g) continue;
          const on = anchors && (enabled[name] ?? []).includes(id);
          write(g.g, `${name}.${id}.o`, 'opacity', on ? st.mix[name].toFixed(2) : '0');
          if (!on) continue;
          const a = anchors[id];
          const tx = a.x + spec.dx;
          const ty = a.y + spec.dy;
          g.line.setAttribute('x1', a.x.toFixed(2));
          g.line.setAttribute('y1', a.y.toFixed(2));
          g.line.setAttribute('x2', (spec.inside ? a.x : tx).toFixed(2));
          g.line.setAttribute('y2', (spec.inside ? a.y : ty).toFixed(2));
          g.dot.setAttribute('cx', a.x.toFixed(2));
          g.dot.setAttribute('cy', a.y.toFixed(2));
          g.dot.style.display = spec.inside ? 'none' : '';
          g.text.setAttribute('x', (tx + (spec.align === 'start' ? 1.5 : spec.align === 'end' ? -1.5 : 0)).toFixed(2));
          g.text.setAttribute('y', (ty + LABEL_PX / scale * 0.36).toFixed(2));
          if (st.dirtyFont) {
            g.text.setAttribute('font-size', (LABEL_PX / scale).toFixed(2));
            g.text.setAttribute('stroke-width', (3 / scale).toFixed(2));
            g.dot.setAttribute('r', (2 / scale).toFixed(2));
            g.line.setAttribute('stroke-width', (1 / scale).toFixed(2));
          }
        }
      }
      st.dirtyFont = false;

      // HUD: pista, cuenta regresiva, progreso y lado de masticación.
      const h = hud.current;
      const cd = s.countdown != null ? ` · ${Math.max(1, Math.ceil(s.countdown - 0.05))}` : '';
      write(h.cue, 'cue', 'text', s.cue ? `${s.cue}${cd}` : '');
      write(h.cue, 'cueColor', 'color', s.effort ? 'var(--color-work)' : 'var(--color-ink-2)');
      const prog = L.mode === 'idle' ? 0 : s.progress ?? 0;
      write(h.bar, 'bar', 'transform', `scaleX(${prog.toFixed(3)})`);
      write(h.barWrap, 'barVis', 'opacity', L.mode === 'idle' || L.mode === 'params' ? '0' : '1');
      const side = s.side ?? 0;
      write(h.sides, 'sidesVis', 'opacity', side ? '1' : '0');
      write(h.left, 'left', 'color', side < 0 ? 'var(--color-work)' : 'var(--color-ink-3)');
      write(h.right, 'right', 'color', side > 0 ? 'var(--color-work)' : 'var(--color-ink-3)');
      write(h.left, 'leftB', 'borderColor', side < 0 ? 'var(--color-work)' : 'transparent');
      write(h.right, 'rightB', 'borderColor', side > 0 ? 'var(--color-work)' : 'transparent');
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  const ref = (k) => (el) => { hud.current[k] = el; };
  const allViews = Object.keys(VIEWS);

  return (
    <div ref={hostRef} className="relative w-full h-full overflow-hidden">
      <HeadSvg ref={svgRef} views={allViews} />
      {/* Rótulos (mismo encuadre que cada vista). */}
      {allViews.map((name) => {
        const vb = VIEWS[name].viewBox;
        return (
          <svg
            key={name}
            viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
            preserveAspectRatio="xMidYMid meet"
            className="pointer-events-none absolute inset-0 w-full h-full"
            aria-hidden="true"
          >
            {Object.entries(LABELS[name] ?? {}).map(([id, spec]) => (
              <g
                key={id}
                style={{ opacity: 0 }}
                ref={(el) => {
                  if (!el) return;
                  labelRefs.current[`${name}.${id}`] = {
                    g: el, line: el.children[0], dot: el.children[1], text: el.children[2],
                  };
                }}
              >
                <line stroke="var(--color-ink-2)" strokeOpacity="0.55" />
                <circle fill="var(--color-ink)" />
                <text
                  textAnchor={spec.align ?? 'middle'}
                  fill="var(--color-ink)"
                  stroke="#100F0C"
                  strokeOpacity="0.75"
                  paintOrder="stroke"
                  fontFamily="IBM Plex Sans, system-ui, sans-serif"
                  fontWeight="600"
                  letterSpacing="0.02em"
                  style={{ textTransform: 'uppercase' }}
                >
                  {spec.text}
                </text>
              </g>
            ))}
          </svg>
        );
      })}
      {showHud && (
        <div className="pointer-events-none absolute inset-0">
          {views.length === 1 && (
            <div className="absolute top-2 left-3 text-[14px] font-medium text-ink-2">
              {label ? `${label} · ` : ''}{VIEWS[view].label}
            </div>
          )}
          {views.length > 1 && (
            <div className="pointer-events-auto absolute top-2 right-2 flex border-2 border-ink/60 bg-scope/80">
              {views.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  aria-pressed={v === view}
                  className={`px-3 py-1.5 text-[15px] font-semibold transition-colors ${
                    v === view ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink'
                  }`}
                >
                  {VIEWS[v].label}
                </button>
              ))}
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-scope/90 to-transparent" />
          <div ref={ref('sides')} className="absolute inset-x-3 bottom-10 flex justify-between transition-opacity duration-300" style={{ opacity: 0 }}>
            <span ref={ref('left')} className="text-[15px] font-bold px-2 py-0.5 border-2">Izquierda</span>
            <span ref={ref('right')} className="text-[15px] font-bold px-2 py-0.5 border-2">Derecha</span>
          </div>
          <span
            ref={ref('cue')}
            className="absolute left-3 right-3 bottom-[14px] text-[18px] font-bold tracking-[0.06em] uppercase text-center"
          />
          <div
            ref={ref('barWrap')}
            className="absolute left-3 right-3 bottom-[6px] h-[5px] bg-ink/20 transition-opacity duration-300"
            style={{ opacity: 0 }}
          >
            <div ref={ref('bar')} className="h-full w-full origin-left bg-ink-2" style={{ transform: 'scaleX(0)' }} />
          </div>
        </div>
      )}
    </div>
  );
}
