import React from 'react';
import { formatTime } from '../utils.js';
import { ROUTINE, TOTAL_DURATION } from '../data/routine.js';
import { EXERCISES } from '../data/exercises.js';
import { ExerciseViewer } from './ExerciseViewer.jsx';

const PHASE_COLORS = {
  work:       { bg: 'bg-lime-500',  text: 'text-lime-400',  border: 'border-lime-500/30',  label: 'TRABAJO' },
  rest:       { bg: 'bg-sky-500',   text: 'text-sky-400',   border: 'border-sky-500/30',   label: 'DESCANSO' },
  transition: { bg: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500/30', label: 'TRANSICIÓN' },
};

function PrevIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function NextIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 6 15 12 9 18" />
    </svg>
  );
}

function PrevExerciseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 18 11 12 17 6" />
      <polyline points="11 18 5 12 11 6" />
    </svg>
  );
}

function NextExerciseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="7 6 13 12 7 18" />
      <polyline points="13 6 19 12 13 18" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
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
  const phaseStyle = PHASE_COLORS[state.phase];

  let phaseLabel;
  if (state.phase === 'work') phaseLabel = `SERIE ${state.set} / ${current.sets}`;
  else if (state.phase === 'rest') phaseLabel = `DESCANSO · próx. serie ${state.set + 1}`;
  else phaseLabel = `TRANSICIÓN · próx. ${nextEx.name}`;

  const overallProgress = (state.totalElapsed / TOTAL_DURATION) * 100;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      <div className="w-full max-w-md mx-auto flex flex-col flex-1">
        <header className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-neutral-500">{current.phase}</div>
              <div className="text-xs text-neutral-400 mt-0.5 tabular-nums">Ejercicio {state.exerciseIdx + 1} / {ROUTINE.length}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-neutral-500">Total</div>
              <div className="text-xs font-mono text-neutral-300 mt-0.5 tabular-nums">
                {formatTime(state.totalElapsed)} / {formatTime(TOTAL_DURATION)}
              </div>
            </div>
          </div>
          <div className="h-[2px] bg-neutral-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-lime-400 transition-all duration-100 ease-linear"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </header>

        <div className="px-5 pb-2">
          <div className="relative bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden" style={{ height: '280px' }}>
            <ExerciseViewer exerciseId={current.exerciseId} paused={state.isPaused} />
            <div className="absolute top-3 left-3 text-[9px] font-mono text-neutral-500 tracking-wider">
              ARRASTRA · ROTAR
            </div>
          </div>
        </div>

        <div className="px-5 py-3">
          <h2 className="text-2xl font-light tracking-tight">{exercise.name}</h2>
          <div className="text-xs text-neutral-500 mt-0.5">{exercise.muscles}</div>
          <p className="text-sm text-neutral-400 mt-2 leading-relaxed">{exercise.instructions}</p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-5 py-4">
          <div className={`text-[10px] font-mono uppercase tracking-[0.4em] mb-3 ${phaseStyle.text}`}>
            {phaseStyle.label}
          </div>
          <div className="font-mono font-light tabular-nums text-[88px] leading-none">
            {formatTime(state.timeRemaining)}
          </div>
          <div className="text-xs text-neutral-500 mt-3 font-mono uppercase tracking-widest">
            {phaseLabel}
          </div>
          {state.phase === 'work' && (
            <div className="mt-3 px-3 py-1 bg-neutral-900 border border-neutral-800 rounded-full">
              <span className="text-xs font-mono text-neutral-300">{current.reps} reps</span>
            </div>
          )}
        </div>

        <div className="px-5 pb-5 pt-2">
          <div className="flex items-center justify-between gap-3 mb-3 px-1 min-h-[20px]">
            <div className="flex-1 flex justify-start min-w-0">
              {prevEx && (
                <button
                  onClick={() => dispatch({ type: 'PREV_EXERCISE' })}
                  className="flex items-center gap-1.5 text-[11px] text-neutral-500 hover:text-neutral-300 transition-colors min-w-0"
                  aria-label={`Ir a ${prevEx.name}`}
                >
                  <PrevExerciseIcon />
                  <span className="truncate">{prevEx.name}</span>
                </button>
              )}
            </div>
            <div className="flex-1 flex justify-end min-w-0">
              {nextEx && (
                <button
                  onClick={() => dispatch({ type: 'NEXT_EXERCISE' })}
                  className="flex items-center gap-1.5 text-[11px] text-neutral-500 hover:text-neutral-300 transition-colors min-w-0"
                  aria-label={`Ir a ${nextEx.name}`}
                >
                  <span className="truncate">{nextEx.name}</span>
                  <NextExerciseIcon />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => dispatch({ type: 'PREV' })}
              className="flex-1 py-3 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 transition-colors flex items-center justify-center"
              aria-label="Repetición anterior"
            >
              <PrevIcon />
            </button>
            <button
              onClick={() => dispatch({ type: 'TOGGLE_PAUSE' })}
              className={`flex-[2] py-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                state.isPaused
                  ? 'bg-lime-400 hover:bg-lime-300 text-neutral-950'
                  : 'bg-neutral-100 hover:bg-white text-neutral-950'
              }`}
            >
              {state.isPaused ? <><PlayIcon /> Reanudar</> : <><PauseIcon /> Pausar</>}
            </button>
            <button
              onClick={() => dispatch({ type: 'NEXT' })}
              className="flex-1 py-3 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 transition-colors flex items-center justify-center"
              aria-label="Repetición siguiente"
            >
              <NextIcon />
            </button>
          </div>
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-neutral-900">
            <button
              onClick={() => dispatch({ type: 'TO_HOME' })}
              className="text-xs text-neutral-500 hover:text-neutral-300 font-mono uppercase tracking-wider"
            >
              ← Inicio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
