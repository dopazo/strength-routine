import React, { useMemo, useState } from 'react';
import { ExerciseViewer } from '../components/ExerciseViewer.jsx';
import { EXERCISES } from '../data/exercises.js';
import { POSES } from '../data/poses.js';
import { ROUTINE, TRANSITION_SEC } from '../data/routine.js';
import { buildRepPlan } from '../animation/tempo.js';

// Pose Lab: herramienta solo de desarrollo (`bun run dev` → `?lab`).
// Permite ver cada ejercicio en bucle o congelado en un instante, editar
// poses con sliders y copiar el resultado para pegarlo en src/data/poses.js.
//
// Parámetros de URL (útiles para capturas automáticas):
//   ex=<id> · mode=demo|work|rest|transition|pose · t=<segundos fijos>
//   pose=<id> · yaw, pitch, dist, ty (cámara) · capture=1 (solo el visor)

const ROT_KEYS = ['rootRot', 'torsoRot', 'headRot', 'lumbarRot', 'thoracicRot',
  'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'hipL', 'hipR', 'kneeL', 'kneeR'];
const HINGES = new Set(['elbowL', 'elbowR', 'kneeL', 'kneeR']);
const toDeg = (r) => Math.round((r * 180) / Math.PI * 2) / 2;
const toRad = (g) => (g * Math.PI) / 180;

function poseToDeg(pose) {
  const out = { rootPos: [...pose.rootPos] };
  for (const k of ROT_KEYS) if (pose[k]) out[k] = pose[k].map(toDeg);
  return out;
}

function degToPose(p) {
  const out = { rootPos: [...p.rootPos] };
  for (const k of ROT_KEYS) if (p[k]) out[k] = p[k].map(toRad);
  return out;
}

function poseSource(name, p) {
  const f = (v) => (Math.abs(v) < 0.25 ? '0' : `d(${v})`);
  const t = (a) => `[${a.map(f).join(', ')}]`;
  const n = (a) => `[${a.map((v) => Math.round(v * 1000) / 1000).join(', ')}]`;
  const lines = [`  ${name}: {`, `    rootPos: ${n(p.rootPos)}, rootRot: ${t(p.rootRot)}, torsoRot: ${t(p.torsoRot)},`];
  if (p.lumbarRot) lines.push(`    lumbarRot: ${t(p.lumbarRot)}, thoracicRot: ${t(p.thoracicRot)},`);
  if (p.headRot) lines.push(`    headRot: ${t(p.headRot)},`);
  lines.push(`    shoulderL: ${t(p.shoulderL)}, shoulderR: ${t(p.shoulderR)},`);
  lines.push(`    elbowL: ${t(p.elbowL)}, elbowR: ${t(p.elbowR)},`);
  lines.push(`    hipL: ${t(p.hipL)}, hipR: ${t(p.hipR)},`);
  lines.push(`    kneeL: ${t(p.kneeL)}, kneeR: ${t(p.kneeR)},`);
  lines.push('  },');
  return lines.join('\n');
}

function Slider({ label, value, min, max, step, onChange }) {
  return (
    <label className="flex items-center gap-2 text-[11px] font-mono">
      <span className="w-6 text-ink-3">{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-[var(--color-blaze)]"
      />
      <span className="w-12 text-right tabular-nums">{value}</span>
    </label>
  );
}

export function PoseLab() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const capture = params.get('capture') === '1';
  const [exerciseId, setExerciseId] = useState(params.get('ex') ?? Object.keys(EXERCISES)[0]);
  const [mode, setMode] = useState(params.get('mode') ?? 'demo');
  const [fixed, setFixed] = useState(params.has('t') ? Number(params.get('t')) : null);
  const [poseId, setPoseId] = useState(params.get('pose') ?? EXERCISES[exerciseId].keyframes[0]);
  const [edit, setEdit] = useState(() => poseToDeg(POSES[poseId]));
  const [copied, setCopied] = useState('');

  const camera = useMemo(() => {
    if (!['yaw', 'pitch', 'dist', 'ty'].some((k) => params.has(k))) return null;
    const ex = EXERCISES[exerciseId].camera ?? {};
    return {
      ...ex,
      yaw: params.has('yaw') ? Number(params.get('yaw')) : ex.yaw,
      pitch: params.has('pitch') ? Number(params.get('pitch')) : ex.pitch,
      dist: params.has('dist') ? Number(params.get('dist')) : ex.dist,
      target: params.has('ty') ? [ex.target?.[0] ?? 0, Number(params.get('ty')), ex.target?.[2] ?? 0] : ex.target,
    };
  }, [params, exerciseId]);

  const routine = ROUTINE.find((r) => r.exerciseId === exerciseId) ?? ROUTINE[0];
  const nextIdx = ROUTINE.indexOf(routine) + 1;
  const plan = useMemo(() => buildRepPlan(EXERCISES[exerciseId]), [exerciseId]);
  const phaseDuration = mode === 'work' ? routine.workSec
    : mode === 'rest' ? routine.restSec
      : mode === 'transition' ? TRANSITION_SEC : plan.repDuration;
  const editedPose = useMemo(() => degToPose(edit), [edit]);

  const choosePose = (id) => {
    setPoseId(id);
    setEdit(poseToDeg(POSES[id]));
    setMode('pose');
  };
  const setAxis = (key, i, v) => setEdit((p) => ({ ...p, [key]: p[key].map((x, j) => (j === i ? v : x)) }));

  const viewer = (
    <ExerciseViewer
      exerciseId={exerciseId}
      nextExerciseId={ROUTINE[nextIdx]?.exerciseId ?? null}
      phase={mode === 'demo' ? 'demo' : mode}
      phaseKey={`lab-${mode}-${exerciseId}`}
      phaseElapsed={fixed ?? 0}
      phaseDuration={phaseDuration}
      workSec={routine.workSec}
      reps={routine.reps}
      fixedTime={fixed}
      freeRun={fixed == null}
      pose={mode === 'pose' ? editedPose : null}
      camera={camera}
    />
  );

  if (capture) {
    return <div className="scope-dark w-screen h-screen bg-scope">{viewer}</div>;
  }

  return (
    <div className="min-h-screen bg-paper text-ink font-sans flex flex-col md:flex-row">
      <div className="scope-dark h-[55vh] md:h-screen md:flex-1 bg-scope border-b md:border-b-0 md:border-r border-line">
        {viewer}
      </div>
      <div className="md:w-[380px] p-4 space-y-4 overflow-y-auto md:h-screen">
        <div className="font-mono text-[10px] tracking-[0.3em] text-blaze uppercase">Pose Lab · dev</div>

        <div className="space-y-2">
          <select
            value={exerciseId}
            onChange={(e) => { setExerciseId(e.target.value); if (mode === 'pose') setMode('demo'); }}
            className="w-full bg-paper-2 border border-line p-2 text-sm"
          >
            {Object.entries(EXERCISES).map(([id, ex]) => <option key={id} value={id}>{ex.name}</option>)}
          </select>
          <div className="grid grid-cols-5 gap-1 text-[10px] font-mono uppercase">
            {['demo', 'work', 'rest', 'transition', 'pose'].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`py-1.5 border ${mode === m ? 'bg-ink text-paper border-ink' : 'border-line text-ink-2'}`}
              >
                {m}
              </button>
            ))}
          </div>
          {mode !== 'pose' && (
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-[11px] font-mono">
                <input type="checkbox" checked={fixed != null} onChange={(e) => setFixed(e.target.checked ? 0 : null)} />
                congelar en un instante
              </label>
              {fixed != null && (
                <Slider
                  label="t" value={fixed} min={0} max={Math.round(phaseDuration * 10) / 10} step={0.05}
                  onChange={setFixed}
                />
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="font-mono text-[10px] tracking-[0.25em] text-ink-3 uppercase">Editar pose</div>
          <select value={poseId} onChange={(e) => choosePose(e.target.value)} className="w-full bg-paper-2 border border-line p-2 text-sm">
            {Object.keys(POSES).map((id) => <option key={id} value={id}>{id}</option>)}
          </select>
          {mode === 'pose' && (
            <div className="space-y-3">
              <div>
                <div className="text-[10px] font-mono text-ink-2">rootPos</div>
                {['x', 'y', 'z'].map((ax, i) => (
                  <Slider key={ax} label={ax} value={edit.rootPos[i]} min={-1.2} max={1.6} step={0.005}
                    onChange={(v) => setAxis('rootPos', i, v)} />
                ))}
              </div>
              {ROT_KEYS.filter((k) => edit[k]).map((k) => (
                <div key={k}>
                  <div className="text-[10px] font-mono text-ink-2">{k}</div>
                  {['x', 'y', 'z'].map((ax, i) => ((HINGES.has(k) && i > 0) ? null : (
                    <Slider key={ax} label={ax} value={edit[k][i]} min={-180} max={180} step={0.5}
                      onChange={(v) => setAxis(k, i, v)} />
                  )))}
                </div>
              ))}
              <button
                onClick={() => {
                  const src = poseSource(poseId, edit);
                  navigator.clipboard?.writeText(src).catch(() => {});
                  setCopied(src);
                }}
                className="w-full py-2 bg-blaze text-ink font-display uppercase tracking-[0.2em] text-sm"
              >
                Copiar pose
              </button>
              {copied && (
                <textarea readOnly value={copied} className="w-full h-48 bg-paper-2 border border-line p-2 font-mono text-[10px]" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
