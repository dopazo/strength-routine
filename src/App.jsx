import React, { useEffect, useReducer, useRef } from 'react';
import { workoutReducer, getInitialState } from './state/workoutReducer.js';
import { StartScreen } from './components/StartScreen.jsx';
import { CompleteScreen } from './components/CompleteScreen.jsx';
import { WorkoutScreen } from './components/WorkoutScreen.jsx';
import { ensureAudio, playCountdownBeep, playPhaseChangeBeep } from './audio/beeps.js';

export default function App() {
  const [state, dispatch] = useReducer(workoutReducer, null, getInitialState);
  const beepRef = useRef({
    timeRemaining: state.timeRemaining,
    key: `${state.exerciseIdx}-${state.set}-${state.phase}`,
  });

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
      playPhaseChangeBeep();
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

  if (!state.isStarted) {
    return <StartScreen onStart={() => { ensureAudio(); dispatch({ type: 'START' }); }} />;
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
