import React, { useEffect, useReducer } from 'react';
import { workoutReducer, getInitialState } from './state/workoutReducer.js';
import { StartScreen } from './components/StartScreen.jsx';
import { CompleteScreen } from './components/CompleteScreen.jsx';
import { WorkoutScreen } from './components/WorkoutScreen.jsx';

export default function App() {
  const [state, dispatch] = useReducer(workoutReducer, null, getInitialState);

  useEffect(() => {
    if (!state.isStarted || state.isPaused || state.isComplete) return;
    const interval = setInterval(() => {
      dispatch({ type: 'TICK', delta: 0.1 });
    }, 100);
    return () => clearInterval(interval);
  }, [state.isStarted, state.isPaused, state.isComplete]);

  if (!state.isStarted) {
    return <StartScreen onStart={() => dispatch({ type: 'START' })} />;
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
