import React, { Suspense, lazy } from 'react';
import { formatTime } from '../utils.js';
import { ROUTINE, TOTAL_DURATION, EXERCISE_BOUNDARIES, TRANSITION_SEC } from '../data/routine.js';
import { EXERCISES } from '../data/exercises.js';
import { loadViewer } from './viewerLoader.js';

// El visor 3D (y Three.js) va en un chunk aparte; ver viewerLoader.js.
const ExerciseViewer = lazy(() => loadViewer().then((m) => ({ default: m.ExerciseViewer })));

const PHASE_STYLE = {
  work:       { bg: 'bg-work',  label: 'Ejercicio' },
  rest:       { bg: 'bg-rest',  label: 'Descanso' },
  transition: { bg: 'bg-trans', label: 'Cambio de ejercicio' },
};

function PrevIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function NextIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
      <polyline points="9 6 15 12 9 18" />
    </svg>
  );
}

function PrevExerciseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square" strokeLinejoin="miter">
      <polyline points="17 18 11 12 17 6" />
      <polyline points="11 18 5 12 11 6" />
    </svg>
  );
}

function NextExerciseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square" strokeLinejoin="miter">
      <polyline points="7 6 13 12 7 18" />
      <polyline points="13 6 19 12 13 18" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  );
}

export function WorkoutScreen({ state, dispatch }) {
  const current = ROUTINE[state.exerciseIdx];
  const exercise = EXERCISES[current.exerciseId];
  const next = state.exerciseIdx < ROUTINE.length - 1 ? ROUTINE[state.exerciseIdx + 1] : null;
  const nextEx = next ? EXERCISES[next.exerciseId] : null;
  const prev = state.exerciseIdx > 0 ? ROUTINE[state.exerciseIdx - 1] : null;
  const prevEx = prev ? EXERCISES[prev.exerciseId] : null;
  const phaseStyle = PHASE_STYLE[state.phase];
  const phaseDuration = state.phase === 'work'
    ? current.workSec
    : state.phase === 'rest' ? current.restSec : TRANSITION_SEC;

  const repsText = `${String(current.reps).replace('-', '–')} repeticiones`;
  let contextLine;
  if (state.phase === 'work') {
    contextLine = `Serie ${state.set} de ${current.sets} · ${repsText}`;
  } else if (state.phase === 'rest') {
    contextLine = `Después: serie ${state.set + 1} de ${current.sets}`;
  } else {
    contextLine = `Después: ${nextEx.name}`;
  }

  const overallProgress = (state.totalElapsed / TOTAL_DURATION) * 100;
  const navBtn = 'flex-1 min-w-0 flex items-center gap-1 py-2 text-[15px] font-semibold text-ink-2 hover:text-ink disabled:opacity-30';
  const sideBtn = 'flex-1 py-2 border-2 border-ink text-ink hover:bg-paper-2 transition-colors flex flex-col items-center justify-center gap-0.5 text-[14px] font-semibold leading-none';

  return (
    <div className="h-[100dvh] bg-paper text-ink flex flex-col font-sans overflow-hidden">
      <div className="w-full max-w-md mx-auto flex flex-col flex-1 min-h-0">
        <header className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between gap-3 mb-2">
            <button
              onClick={() => dispatch({ type: 'TO_HOME' })}
              className="text-[16px] font-semibold text-ink-2 hover:text-ink py-1 pr-2"
            >
              ‹ Salir
            </button>
            <span className="text-[16px] font-semibold tabular-nums">
              Ejercicio {state.exerciseIdx + 1} de {ROUTINE.length}
            </span>
          </div>
          <div className="relative h-[6px] bg-paper-2 border border-line" aria-hidden="true">
            <div
              className="absolute inset-y-0 left-0 bg-blaze transition-all duration-100 ease-linear"
              style={{ width: `${overallProgress}%` }}
            />
            {EXERCISE_BOUNDARIES.map((left, i) => (
              <div
                key={i}
                className="absolute inset-y-0 w-[2px] bg-paper"
                style={{ left: `${left}%` }}
              />
            ))}
          </div>
          <div className="text-[14px] text-ink-2 tabular-nums mt-1 text-right">
            {formatTime(state.totalElapsed)} de {formatTime(TOTAL_DURATION)} en total
          </div>
        </header>

        <div className="px-4 pb-2 flex-1 min-h-[170px] flex flex-col">
          <div className="scope-dark relative flex-1 bg-scope border-2 border-ink overflow-hidden">
            <Suspense fallback={null}>
              <ExerciseViewer
                exerciseId={current.exerciseId}
                nextExerciseId={next?.exerciseId ?? null}
                phase={state.phase}
                phaseKey={`${state.exerciseIdx}-${state.set}-${state.phase}`}
                phaseElapsed={Math.max(0, phaseDuration - state.timeRemaining)}
                phaseDuration={phaseDuration}
                workSec={current.workSec}
                reps={current.reps}
                paused={state.isPaused}
              />
            </Suspense>
          </div>
        </div>

        <div className="px-4 py-1">
          <h2 className="font-display font-semibold text-[26px] uppercase tracking-tight leading-none text-ink">
            {exercise.name}
          </h2>
          <p className="text-[16px] text-ink-2 mt-1.5 leading-snug">{exercise.instructions}</p>
        </div>

        <div className="px-4 py-1.5" aria-live="polite">
          <div className="flex flex-col items-center">
            <span className={`text-[17px] font-bold px-3 py-0.5 text-paper ${phaseStyle.bg}`}>
              {state.isPaused ? 'En pausa' : phaseStyle.label}
            </span>
            <div
              className="font-display font-bold tabular-nums text-ink mt-1"
              style={{ fontSize: '72px', lineHeight: '0.9', letterSpacing: '-0.01em' }}
            >
              {formatTime(state.timeRemaining)}
            </div>
            <div className="text-[17px] font-medium text-ink-2 mt-0.5 tabular-nums text-center">
              {contextLine}
            </div>
          </div>
        </div>

        <div className="px-4 pb-3 pt-1">
          <div className="flex items-stretch gap-2">
            <button
              onClick={() => dispatch({ type: 'PREV' })}
              className={sideBtn}
              aria-label="Volver a la serie anterior"
            >
              <PrevIcon />
              Atrás
            </button>
            <button
              onClick={() => dispatch({ type: 'TOGGLE_PAUSE' })}
              className={`flex-[2] py-4 font-display font-semibold uppercase tracking-[0.1em] text-[21px] flex items-center justify-center gap-2.5 transition ${
                state.isPaused ? 'bg-blaze text-paper hover:brightness-110' : 'bg-ink text-paper hover:opacity-90'
              }`}
            >
              {state.isPaused ? <><PlayIcon /> Seguir</> : <><PauseIcon /> Pausa</>}
            </button>
            <button
              onClick={() => dispatch({ type: 'NEXT' })}
              className={sideBtn}
              aria-label="Saltar este tiempo"
            >
              <NextIcon />
              Saltar
            </button>
          </div>
          <div className="flex items-center justify-between gap-3 mt-1.5">
            <button
              onClick={() => dispatch({ type: 'PREV_EXERCISE' })}
              disabled={!prevEx}
              className={`${navBtn} justify-start`}
              aria-label={prevEx ? `Ir al ejercicio anterior: ${prevEx.name}` : 'No hay ejercicio anterior'}
            >
              <PrevExerciseIcon />
              <span className="truncate">Ejercicio anterior</span>
            </button>
            <button
              onClick={() => dispatch({ type: 'NEXT_EXERCISE' })}
              disabled={!nextEx}
              className={`${navBtn} justify-end`}
              aria-label={nextEx ? `Ir al ejercicio siguiente: ${nextEx.name}` : 'No hay ejercicio siguiente'}
            >
              <span className="truncate">Ejercicio siguiente</span>
              <NextExerciseIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
