import React, { forwardRef, useId, useImperativeHandle, useRef } from 'react';
import { VIEWS } from '../../swallow/views.js';
import { PALETTE as C } from '../../swallow/palette.js';

const ATTRS = ['d', 'opacity', 'fill', 'transform'];

// Gradientes y filtros compartidos por las capas (`url(#id)` en sus estilos).
function Defs({ p, vb }) {
  return (
    <defs>
      <radialGradient id={`${p}tissueGrad`} gradientUnits="userSpaceOnUse" cx="52" cy="62" r="120">
        <stop offset="0" stopColor={C.tissueHi} />
        <stop offset="0.6" stopColor={C.tissue} />
        <stop offset="1" stopColor={C.tissueLow} />
      </radialGradient>
      <radialGradient id={`${p}tongueGrad`} cx="0.5" cy="0.3" r="0.75">
        <stop offset="0" stopColor={C.tongueHi} />
        <stop offset="0.55" stopColor={C.tongue} />
        <stop offset="1" stopColor={C.tongueLow} />
      </radialGradient>
      <radialGradient id={`${p}boneGrad`} cx="0.5" cy="0.5" r="0.7">
        <stop offset="0" stopColor={C.boneLow} />
        <stop offset="1" stopColor={C.bone} />
      </radialGradient>
      <radialGradient id={`${p}faceGrad`} gradientUnits="userSpaceOnUse" cx="-14" cy="-6" r="112">
        <stop offset="0" stopColor="#E6DFD0" />
        <stop offset="0.62" stopColor={C.face} />
        <stop offset="1" stopColor={C.faceShade} />
      </radialGradient>
      <linearGradient id={`${p}neckGrad`} gradientUnits="userSpaceOnUse" x1="-60" y1="0" x2="60" y2="0">
        <stop offset="0" stopColor={C.faceShade} />
        <stop offset="0.45" stopColor={C.face} />
        <stop offset="1" stopColor={C.faceShade} />
      </linearGradient>
      <radialGradient id={`${p}xrayGrad`}>
        <stop offset="0" stopColor="#2E241D" stopOpacity="0.9" />
        <stop offset="0.62" stopColor="#3A2E26" stopOpacity="0.7" />
        <stop offset="1" stopColor="#3A2E26" stopOpacity="0" />
      </radialGradient>
      <filter id={`${p}glow`} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="1.4" result="b" />
        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id={`${p}blur1`} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="0.9" />
      </filter>
      <filter id={`${p}soft`} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="3" />
      </filter>
      {/* Difumina el borde superior (la cabeza queda cortada por el encuadre). */}
      <linearGradient id={`${p}fadeTop`} gradientUnits="userSpaceOnUse" x1="0" y1={vb.y} x2="0" y2={vb.y + 20}>
        <stop offset="0" stopColor="black" />
        <stop offset="1" stopColor="white" />
      </linearGradient>
      <mask id={`${p}fade`} maskUnits="userSpaceOnUse" x={vb.x - 60} y={vb.y - 60} width={vb.w + 120} height={vb.h + 120}>
        <rect x={vb.x - 60} y={vb.y - 60} width={vb.w + 120} height={vb.h + 120} fill={`url(#${p}fadeTop)`} />
      </mask>
    </defs>
  );
}

// Dibujo SVG de las vistas de la cabeza (una capa <svg> por vista, cada una
// con su encuadre). Se monta una sola vez; cada frame se llama
// `update(params, mix)` (vía ref) y solo se escriben en el DOM los atributos
// que cambiaron, sin re-render de React. `mix` = { vista: opacidad }.
export const HeadSvg = forwardRef(function HeadSvg({ views = ['side'] }, ref) {
  const uid = useId().replace(/:/g, '');
  const viewRefs = useRef({});
  const layerRefs = useRef({});
  const last = useRef({});

  useImperativeHandle(ref, () => ({
    update(params, mix) {
      for (const name of views) {
        const view = VIEWS[name];
        const vis = mix[name] ?? 0;
        const el = viewRefs.current[name];
        const visVal = vis.toFixed(3);
        if (el && last.current[`${name}|vis`] !== visVal) {
          last.current[`${name}|vis`] = visVal;
          el.style.opacity = visVal;
          el.style.visibility = vis < 0.005 ? 'hidden' : 'visible';
        }
        if (vis < 0.005) continue;
        const out = view.compute(params);
        const ids = [...view.layers.map((l) => l.id), ...(view.clips ?? []).map((c) => `clip_${c}`)];
        for (const id of ids) {
          const node = layerRefs.current[`${name}.${id}`];
          const o = out[id];
          if (!node || !o) continue;
          for (const attr of ATTRS) {
            if (o[attr] === undefined) continue;
            const key = `${name}.${id}.${attr}`;
            const val = attr === 'opacity' ? Number(o[attr]).toFixed(3) : o[attr];
            if (last.current[key] === val) continue;
            last.current[key] = val;
            if (attr === 'opacity') node.style.opacity = val;
            else node.setAttribute(attr, val || 'M0 0');
          }
        }
      }
    },
  }), [views]);

  return (
    <div className="absolute inset-0" aria-hidden="true">
      {views.map((name) => {
        const view = VIEWS[name];
        const vb = view.viewBox;
        const p = `${uid}${name}`;
        const fixUrl = (v) => (typeof v === 'string' ? v.replace(/url\(#(\w+)\)/, `url(#${p}$1)`) : v);
        const setRef = (id) => (el) => { layerRefs.current[`${name}.${id}`] = el; };
        return (
          <svg
            key={name}
            ref={(el) => { viewRefs.current[name] = el; }}
            viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
            preserveAspectRatio="xMidYMid meet"
            className="absolute inset-0 w-full h-full"
            style={{ opacity: 0, visibility: 'hidden' }}
          >
            <Defs p={p} vb={vb} />
            <defs>
              {(view.clips ?? []).map((c) => (
                <clipPath key={c} id={`${p}clip_${c}`}>
                  <path ref={setRef(`clip_${c}`)} />
                </clipPath>
              ))}
            </defs>
            <g mask={`url(#${p}fade)`}>
              {view.layers.map((layer) => {
                const props = {};
                for (const [k, v] of Object.entries(layer.style ?? {})) {
                  if (k !== 'opacity') props[k] = fixUrl(v);
                }
                if (layer.clip) props.clipPath = `url(#${p}clip_${layer.clip})`;
                const style = layer.style?.opacity != null ? { opacity: layer.style.opacity } : undefined;
                return <path key={layer.id} ref={setRef(layer.id)} {...props} style={style} />;
              })}
            </g>
          </svg>
        );
      })}
    </div>
  );
});
