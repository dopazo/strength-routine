import React, { useMemo, useState } from 'react';
import { HeadViewer } from '../components/swallow/HeadViewer.jsx';
import { SWALLOW_EXERCISES } from '../data/swallowExercises.js';
import { VIEWS } from '../swallow/views.js';

// Head Lab: herramienta de desarrollo para las láminas de deglución
// (`bun run dev` → `?headlab`). Parámetros de URL (útiles para capturas):
//   ex=<id> · mode=demo|rep|work|idle|params · t=<segundos fijos> · dur=<s>
//   view=side|front · p=jaw:10,tPress:1 (con mode=params) · capture=1
const PARAMS = [
  ['jaw', -2, 20], ['jawX', -4, 4], ['tCup', 0, 1], ['tSqueeze', 0, 1], ['tBack', 0, 1], ['tPress', 0, 1],
  ['tOut', 0, 1], ['velum', 0, 1], ['hyo', 0, 1], ['epi', 0, 1], ['phx', 0, 1], ['ues', 0, 1],
  ['bolus', 0, 1], ['bolusA', 0, 1], ['tongueEffort', 0, 1], ['supraEffort', 0, 1], ['wallEffort', 0, 1],
  ['glow', 0, 1], ['hand', 0, 1], ['arrow', 0, 1], ['masL', 0, 1], ['masR', 0, 1], ['xray', 0, 1],
  ['gum', -1, 1], ['lipSeal', 0, 1], ['squint', 0, 1],
];
const MODES = ['demo', 'rep', 'work', 'idle', 'params'];

function parseP(s) {
  const out = {};
  for (const part of (s ?? '').split(',')) {
    const [k, v] = part.split(':');
    if (k && v != null) out[k] = Number(v);
  }
  return out;
}

export function HeadLab() {
  const url = useMemo(() => new URLSearchParams(window.location.search), []);
  const capture = url.get('capture') === '1';
  const [exerciseId, setExerciseId] = useState(url.get('ex') ?? (url.has('p') ? null : 'mendelsohn'));
  const [mode, setMode] = useState(url.get('mode') ?? (url.has('p') ? 'params' : 'demo'));
  const [fixed, setFixed] = useState(url.has('t') ? Number(url.get('t')) : null);
  const [params, setParams] = useState(() => parseP(url.get('p')));
  const dur = Number(url.get('dur') ?? 20);

  const viewer = (
    <HeadViewer
      key={`${exerciseId}|${url.get('view')}`}
      exerciseId={mode === 'params' && !exerciseId ? null : exerciseId}
      mode={mode}
      modeKey={`lab-${mode}`}
      duration={dur}
      params={params}
      fixedTime={fixed}
      initialView={url.get('view')}
      showHud={!url.has('nohud')}
    />
  );
  if (capture) return <div className="scope-dark relative w-screen h-screen bg-scope">{viewer}</div>;

  return (
    <div className="min-h-screen bg-paper text-ink font-sans flex flex-col md:flex-row">
      <div className="scope-dark relative h-[60vh] md:h-screen md:flex-1 bg-scope border-b md:border-b-0 md:border-r border-line">{viewer}</div>
      <div className="md:w-[360px] p-4 space-y-2 overflow-y-auto md:h-screen">
        <div className="font-mono text-[10px] tracking-[0.3em] text-blaze uppercase">Head Lab · dev</div>
        <select
          value={exerciseId ?? ''}
          onChange={(e) => setExerciseId(e.target.value || null)}
          className="w-full bg-paper-2 border border-line p-2 text-sm"
        >
          <option value="">(sin ejercicio)</option>
          {Object.entries(SWALLOW_EXERCISES).map(([id, ex]) => <option key={id} value={id}>{ex.name}</option>)}
        </select>
        <div className="grid grid-cols-5 gap-1 text-[10px] font-mono uppercase">
          {MODES.map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`py-1.5 border ${mode === m ? 'bg-ink text-paper border-ink' : 'border-line text-ink-2'}`}>{m}</button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-[11px] font-mono">
          <input type="checkbox" checked={fixed != null} onChange={(e) => setFixed(e.target.checked ? 0 : null)} />
          congelar en t
          {fixed != null && (
            <input type="range" min={0} max={15} step={0.05} value={fixed} onChange={(e) => setFixed(Number(e.target.value))} className="flex-1" />
          )}
          {fixed != null && <span className="tabular-nums w-10 text-right">{fixed.toFixed(2)}</span>}
        </label>
        {mode === 'params' && PARAMS.map(([k, min, max]) => (
          <label key={k} className="flex items-center gap-2 text-[11px] font-mono">
            <span className="w-24 text-ink-3">{k}</span>
            <input
              type="range" min={min} max={max} step={(max - min) / 200} value={params[k] ?? 0}
              onChange={(e) => setParams((p) => ({ ...p, [k]: Number(e.target.value) }))}
              className="flex-1 accent-[var(--color-blaze)]"
            />
            <span className="w-10 text-right tabular-nums">{(params[k] ?? 0).toFixed(2)}</span>
          </label>
        ))}
        {mode === 'params' && (
          <textarea readOnly className="w-full h-24 bg-paper-2 border border-line p-2 font-mono text-[10px]"
            value={Object.entries(params).filter(([, v]) => v).map(([k, v]) => `${k}:${+v.toFixed(3)}`).join(',')} />
        )}
        <p className="text-[11px] text-ink-3">Vistas: {Object.keys(VIEWS).join(', ')}</p>
      </div>
    </div>
  );
}
