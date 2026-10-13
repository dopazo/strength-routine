import React, { useEffect, useRef } from 'react';
import { createExerciseScene } from '../three/exerciseScene.js';

const pad2 = (n) => String(n).padStart(2, '0');

const CUE_COLOR = {
  effort: 'var(--color-work)',
  control: 'var(--color-ink-2)',
  prep: 'var(--color-trans)',
  rest: 'var(--color-rest)',
};

// Actualiza el HUD escribiendo directo en el DOM (cada frame, sin re-render
// de React) y solo cuando cambia algún valor.
function createHudWriter(refs) {
  const last = {};
  const set = (key, el, prop, value) => {
    if (!el || last[key] === value) return;
    last[key] = value;
    if (prop === 'text') el.textContent = value;
    else el.style[prop] = value;
  };
  return ({ hud }) => {
    const r = refs.current;
    const kind = hud?.kind ?? 'none';
    const showTop = kind === 'rep' || kind === 'preview';
    set('topVis', r.top, 'opacity', showTop ? '1' : '0');
    if (kind === 'rep') {
      set('label', r.label, 'text', 'REP');
      set('value', r.value, 'text', `${pad2(hud.rep)}/${pad2(hud.total ?? 0)}`);
    } else if (kind === 'preview') {
      set('label', r.label, 'text', 'VISTA PREVIA');
      set('value', r.value, 'text', hud.name ?? '');
    }
    const cue = hud?.cue ?? '';
    let tone = 'control';
    if (cue === 'PREPÁRATE') tone = 'prep';
    else if (cue === 'RESPIRA') tone = 'rest';
    else if (hud?.effort && hud?.phase !== 'lead') tone = 'effort';
    set('cue', r.cue, 'text', cue);
    set('cueColor', r.cue, 'color', CUE_COLOR[tone]);
    const showBar = kind === 'rep' || kind === 'preview' || kind === 'demo';
    set('barVis', r.barWrap, 'opacity', showBar ? '1' : '0');
    if (showBar) {
      set('bar', r.bar, 'transform', `scaleX(${(hud.rom ?? 0).toFixed(3)})`);
      set('barColor', r.bar, 'backgroundColor', tone === 'effort' ? CUE_COLOR.effort : 'var(--color-ink-2)');
    }
  };
}

// Visor 3D del ejercicio. La escena se construye una sola vez; los props se
// pasan a la escena como "contexto" (fase del entrenamiento y segundos
// transcurridos) y la escena decide la pose de cada frame.
//
// Props:
//   exerciseId, nextExerciseId — ejercicio actual y siguiente (vista previa)
//   phase        — 'work' | 'rest' | 'transition' (o 'demo'/'pose' en el lab)
//   phaseKey     — identifica la fase actual (cambia al saltar de fase)
//   phaseElapsed — segundos transcurridos en la fase
//   phaseDuration, workSec, reps — duración de la fase y datos de la serie
//   paused       — congela la repetición (el muñeco sigue respirando)
//   fixedTime, pose, camera, freeRun — solo para el Pose Lab (freeRun: el
//                reloj corre solo, sin temporizador externo)
//   onScene      — recibe la instancia de escena (Pose Lab)
export function ExerciseViewer({
  exerciseId, nextExerciseId = null, phase = 'demo', phaseKey = 'demo', phaseElapsed = 0,
  phaseDuration = 0, workSec = null, reps = null, paused = false, fixedTime = null, pose = null,
  camera = null, freeRun = false, onScene, showHud = true,
}) {
  const hostRef = useRef(null);
  const sceneRef = useRef(null);
  const hudRefs = useRef({});

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const writeHud = createHudWriter(hudRefs);
    const scene = createExerciseScene(host, { onFrame: writeHud });
    sceneRef.current = scene;
    onScene?.(scene);
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
    // La escena se crea una sola vez; los props llegan por setContext.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    sceneRef.current?.setContext({
      exerciseId, nextExerciseId, phase, phaseKey, phaseElapsed, phaseDuration, workSec, reps, fixedTime, pose, camera, freeRun,
    });
  }, [exerciseId, nextExerciseId, phase, phaseKey, phaseElapsed, phaseDuration, workSec, reps, fixedTime, pose, camera, freeRun]);

  useEffect(() => {
    sceneRef.current?.setPaused(paused);
  }, [paused]);

  const ref = (k) => (el) => { hudRefs.current[k] = el; };

  return (
    <div className="relative w-full h-full">
      <div ref={hostRef} className="absolute inset-0" />
      {showHud && (
        <div className="pointer-events-none absolute inset-0">
          <div
            ref={ref('top')}
            className="absolute top-2 right-3 flex flex-col items-end max-w-[62%] transition-opacity duration-300"
            style={{ opacity: 0 }}
          >
            <span ref={ref('label')} className="font-mono text-[9px] tracking-[0.25em] text-ink/45 uppercase" />
            <span
              ref={ref('value')}
              className="font-display font-semibold text-[17px] leading-none text-ink tabular-nums uppercase truncate max-w-full mt-0.5"
            />
          </div>
          <span
            ref={ref('cue')}
            className="absolute left-3 bottom-[13px] font-mono text-[10px] font-medium tracking-[0.3em] uppercase"
          />
          <div
            ref={ref('barWrap')}
            className="absolute left-3 right-3 bottom-[7px] h-[3px] bg-ink/10 transition-opacity duration-300"
            style={{ opacity: 0 }}
          >
            <div ref={ref('bar')} className="h-full w-full origin-left" style={{ transform: 'scaleX(0)' }} />
          </div>
        </div>
      )}
    </div>
  );
}
