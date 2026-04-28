import React from 'react';
import { formatTime } from '../utils.js';
import { ROUTINE, TOTAL_DURATION, EXERCISE_BOUNDARIES } from '../data/routine.js';
import { EXERCISES } from '../data/exercises.js';
import { ExerciseViewer } from './ExerciseViewer.jsx';

const PHASE_STYLE = {
  work:       { text: 'text-work',  border: 'border-work',  label: 'TRABAJO' },
  rest:       { text: 'text-rest',  border: 'border-rest',  label: 'DESCANSO' },
  transition: { text: 'text-trans', border: 'border-trans', label: 'TRANSICIÓN' },
};

const pad2 = (n) => String(n).padStart(2, '0');

function PrevIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function NextIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
      <polyline points="9 6 15 12 9 18" />
    </svg>
  );
}

function PrevExerciseIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square" strokeLinejoin="miter">
      <polyline points="17 18 11 12 17 6" />
      <polyline points="11 18 5 12 11 6" />
    </svg>
  );
}

function NextExerciseIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square" strokeLinejoin="miter">
      <polyline points="7 6 13 12 7 18" />
      <polyline points="13 6 19 12 13 18" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
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

  let contextLine;
  if (state.phase === 'work') {
    contextLine = `SERIE ${pad2(state.set)}/${pad2(current.sets)} · ${current.workSec}S`;
  } else if (state.phase === 'rest') {
    contextLine = `PRÓX. SERIE ${pad2(state.set + 1)}/${pad2(current.sets)}`;
  } else {
    contextLine = `PRÓX. ${nextEx.name.toUpperCase()}`;
  }

  const overallProgress = (state.totalElapsed / TOTAL_DURATION) * 100;
  const dorsal = `${pad2(state.exerciseIdx + 1)}/${pad2(ROUTINE.length)}`;

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col font-sans">
      <div className="w-full max-w-md mx-auto flex flex-col flex-1">
        <header className="px-5 pt-3 pb-2">
          <div className="flex items-baseline justify-between mb-2">
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-ink-3">FASE</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink truncate">{current.phase}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-ink-3 tabular-nums">
                {formatTime(state.totalElapsed)}/{formatTime(TOTAL_DURATION)}
              </span>
              <span className="font-display font-semibold text-ink text-base leading-none tabular-nums">
                {dorsal}
              </span>
            </div>
          </div>
          <div className="relative h-[3px] bg-line">
            <div
              className="absolute inset-y-0 left-0 bg-blaze transition-all duration-100 ease-linear"
              style={{ width: `${overallProgress}%` }}
            />
            {EXERCISE_BOUNDARIES.map((left, i) => (
              <div
                key={i}
                className="absolute top-[-2px] bottom-[-2px] w-px bg-paper"
                style={{ left: `${left}%` }}
              />
            ))}
          </div>
        </header>

        <div className="px-5 pb-2">
          <div className="relative bg-scope border border-ink overflow-hidden" style={{ height: '230px' }}>
            <ExerciseViewer exerciseId={current.exerciseId} paused={state.isPaused} />
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-ink/60" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-ink/60" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-ink/60" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-ink/60" />
            </div>
            <div className="absolute top-2 left-3 font-mono text-[9px] tracking-[0.25em] text-ink/40">
              CAM·01 · ARRASTRA
            </div>
          </div>
        </div>

        <div className="px-5 py-1.5">
          <h2 className="font-display font-semibold text-[22px] uppercase tracking-tight leading-none text-ink">
            {exercise.name}
          </h2>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-3 mt-1.5">
            {exercise.muscles}
          </div>
          <p className="text-[13px] text-ink-2 mt-1.5 leading-snug">{exercise.instructions}</p>
        </div>

        <div className="px-5 py-1">
          <div className="flex flex-col items-center">
            <span
              className={`font-mono text-[10px] font-medium uppercase tracking-[0.4em] px-2 py-0.5 border ${phaseStyle.border} ${phaseStyle.text}`}
            >
              {phaseStyle.label}
            </span>
            <div
              className="font-display font-bold tabular-nums text-ink mt-1.5"
              style={{ fontSize: '76px', lineHeight: '0.85', letterSpacing: '-0.02em' }}
            >
              {formatTime(state.timeRemaining)}
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-3 mt-1 tabular-nums">
              {contextLine}
            </div>
          </div>
        </div>

        <div className="mt-auto px-5 pb-3 pt-2">
          <div className="flex items-center justify-between gap-3 mb-2 px-1 min-h-[18px]">
            <div className="flex-1 flex justify-start min-w-0">
              {prevEx && (
                <button
                  onClick={() => dispatch({ type: 'PREV_EXERCISE' })}
                  className="flex items-center gap-2 min-w-0 group"
                  aria-label={`Ir a ${prevEx.name}`}
                >
                  <PrevExerciseIcon />
                  <span className="font-display font-semibold text-[13px] text-ink leading-none tabular-nums">
                    {pad2(state.exerciseIdx)}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-3 truncate group-hover:text-ink">
                    {prevEx.name}
                  </span>
                </button>
              )}
            </div>
            <div className="flex-1 flex justify-end min-w-0">
              {nextEx && (
                <button
                  onClick={() => dispatch({ type: 'NEXT_EXERCISE' })}
                  className="flex items-center gap-2 min-w-0 group"
                  aria-label={`Ir a ${nextEx.name}`}
                >
                  <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-3 truncate group-hover:text-ink">
                    {nextEx.name}
                  </span>
                  <span className="font-display font-semibold text-[13px] text-ink leading-none tabular-nums">
                    {pad2(state.exerciseIdx + 2)}
                  </span>
                  <NextExerciseIcon />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-stretch gap-2">
            <button
              onClick={() => dispatch({ type: 'PREV' })}
              className="flex-1 py-2.5 border border-ink/40 text-ink hover:bg-paper-2 transition-colors flex items-center justify-center"
              aria-label="Repetición anterior"
            >
              <PrevIcon />
            </button>
            <button
              onClick={() => dispatch({ type: 'TOGGLE_PAUSE' })}
              className={`flex-[2] py-3 font-display font-semibold uppercase tracking-[0.22em] text-[15px] flex items-center justify-center gap-2 transition-colors ${
                state.isPaused
                  ? 'bg-blaze text-ink hover:bg-[#f06028]'
                  : 'bg-ink text-paper hover:bg-[#d8d2c2]'
              }`}
            >
              {state.isPaused ? <><PlayIcon /> Reanudar</> : <><PauseIcon /> Pausar</>}
            </button>
            <button
              onClick={() => dispatch({ type: 'NEXT' })}
              className="flex-1 py-2.5 border border-ink/40 text-ink hover:bg-paper-2 transition-colors flex items-center justify-center"
              aria-label="Repetición siguiente"
            >
              <NextIcon />
            </button>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-line">
            <button
              onClick={() => dispatch({ type: 'TO_HOME' })}
              className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-3 hover:text-ink"
            >
              ‹‹ INICIO
            </button>
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-3 tabular-nums">
              REPS·{current.reps}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
