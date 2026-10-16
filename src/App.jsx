import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { workoutReducer, getInitialState } from './state/workoutReducer.js';
import { StartScreen } from './components/StartScreen.jsx';
import { CompleteScreen } from './components/CompleteScreen.jsx';
import { WorkoutScreen } from './components/WorkoutScreen.jsx';
import { ensureAudio, playCountdownBeep, playPhaseChangeBeep, playSkipBeep } from './audio/beeps.js';
import { preloadViewerWhenIdle } from './components/viewerLoader.js';
import { initialSwallowState, swallowReducer } from './state/swallowReducer.js';
import { SWALLOW_ROUTINE, sessionItems } from './data/swallowRoutine.js';
import { getDay, useSwallowLogSync } from './swallow/log.js';
import { SwallowSession } from './components/swallow/SwallowSession.jsx';
import { SwallowComplete } from './components/swallow/SwallowComplete.jsx';
import { preloadHeadViewerWhenIdle } from './components/swallow/headLoader.js';

const SKIP_ACTIONS = new Set(['NEXT', 'PREV', 'NEXT_EXERCISE', 'PREV_EXERCISE']);

// Programa elegido en el inicio (se recuerda en este dispositivo).
const PROGRAM_KEY = 'programa';
const TITLES = { fuerza: 'Rutina de fuerza · banda elástica', deglucion: 'Rutina de deglución' };
function readProgram() {
  try {
    const v = window.localStorage.getItem(PROGRAM_KEY);
    return v === 'deglucion' ? v : 'fuerza';
  } catch {
    return 'fuerza';
  }
}

export default function App() {
  const [state, rawDispatch] = useReducer(workoutReducer, null, getInitialState);
  const [swallow, swallowDispatch] = useReducer(swallowReducer, null, initialSwallowState);
  const [program, setProgram] = useState(readProgram);
  useSwallowLogSync(swallow);
  const lastSkipAtRef = useRef(0);
  const beepRef = useRef({
    timeRemaining: state.timeRemaining,
    key: `${state.exerciseIdx}-${state.set}-${state.phase}`,
  });

  const dispatch = useCallback((action) => {
    if (SKIP_ACTIONS.has(action.type)) {
      lastSkipAtRef.current = Date.now();
    }
    rawDispatch(action);
  }, []);

  // Descarga en segundo plano el visor del programa elegido (el 3D de la
  // rutina de fuerza o las láminas de deglución) mientras se muestra el inicio.
  useEffect(() => (program === 'fuerza' ? preloadViewerWhenIdle() : preloadHeadViewerWhenIdle()), [program]);

  useEffect(() => {
    document.title = TITLES[program];
    try {
      window.localStorage.setItem(PROGRAM_KEY, program);
    } catch {
      // Sin almacenamiento: se vuelve a la pestaña por defecto la próxima vez.
    }
  }, [program]);

  const startSwallow = useCallback(({ full, only = null }) => {
    ensureAudio();
    const items = only
      ? SWALLOW_ROUTINE.filter((r) => r.exerciseId === only)
      : sessionItems({ doneToday: getDay().chewDone ? ['chewing'] : [] });
    swallowDispatch({ type: 'START', items, full, now: Date.now() });
  }, []);

  useEffect(() => {
    if (!state.isStarted || state.isPaused || state.isComplete) return;
    const interval = setInterval(() => {
      dispatch({ type: 'TICK', delta: 0.1 });
    }, 100);
    return () => clearInterval(interval);
  }, [state.isStarted, state.isPaused, state.isComplete]);

  useEffect(() => {
    if (!state.isStarted || state.isComplete) {
      beepRef.current = {
        timeRemaining: state.timeRemaining,
        key: `${state.exerciseIdx}-${state.set}-${state.phase}`,
      };
      return;
    }
    const currKey = `${state.exerciseIdx}-${state.set}-${state.phase}`;
    const prev = beepRef.current;
    if (prev.key !== currKey) {
      const justSkipped = Date.now() - lastSkipAtRef.current < 200;
      if (justSkipped) {
        playSkipBeep();
        lastSkipAtRef.current = 0;
      } else {
        playPhaseChangeBeep();
      }
    } else if (!state.isPaused) {
      const p = prev.timeRemaining;
      const c = state.timeRemaining;
      if (p > 3 && c <= 3) playCountdownBeep();
      if (p > 2 && c <= 2) playCountdownBeep();
      if (p > 1 && c <= 1) playCountdownBeep();
    }
    beepRef.current = { timeRemaining: state.timeRemaining, key: currKey };
  }, [
    state.timeRemaining,
    state.exerciseIdx,
    state.set,
    state.phase,
    state.isStarted,
    state.isComplete,
    state.isPaused,
  ]);

  if (swallow.active) {
    if (swallow.complete) {
      return <SwallowComplete state={swallow} onHome={() => swallowDispatch({ type: 'EXIT' })} />;
    }
    return <SwallowSession state={swallow} dispatch={swallowDispatch} />;
  }
  if (!state.isStarted) {
    return (
      <StartScreen
        program={program}
        onProgram={setProgram}
        onStart={() => { ensureAudio(); dispatch({ type: 'START' }); }}
        onStartSwallow={startSwallow}
      />
    );
  }
  if (state.isComplete) {
    return (
      <CompleteScreen
        totalElapsed={state.totalElapsed}
        onRestart={() => dispatch({ type: 'RESTART' })}
        onHome={() => dispatch({ type: 'TO_HOME' })}
      />
    );
  }
  return <WorkoutScreen state={state} dispatch={dispatch} />;
}
