import { ROUTINE, TRANSITION_SEC, TOTAL_DURATION } from '../data/routine.js';

export function getInitialState() {
  return {
    isStarted: false,
    isComplete: false,
    isPaused: false,
    exerciseIdx: 0,
    set: 1,
    phase: 'work',
    timeRemaining: ROUTINE[0].workSec,
    totalElapsed: 0,
  };
}

function advancePhase(state) {
  const ex = ROUTINE[state.exerciseIdx];
  if (state.phase === 'work') {
    if (state.set < ex.sets) {
      return { ...state, phase: 'rest', timeRemaining: ex.restSec };
    }
    if (state.exerciseIdx >= ROUTINE.length - 1) {
      return { ...state, isComplete: true, isPaused: true, timeRemaining: 0 };
    }
    return { ...state, phase: 'transition', timeRemaining: TRANSITION_SEC };
  }
  if (state.phase === 'rest') {
    return { ...state, phase: 'work', set: state.set + 1, timeRemaining: ex.workSec };
  }
  const nextEx = ROUTINE[state.exerciseIdx + 1];
  return {
    ...state,
    exerciseIdx: state.exerciseIdx + 1,
    set: 1,
    phase: 'work',
    timeRemaining: nextEx.workSec,
  };
}

export function workoutReducer(state, action) {
  switch (action.type) {
    case 'START':
      return { ...state, isStarted: true, isPaused: false };
    case 'TICK': {
      if (!state.isStarted || state.isPaused || state.isComplete) return state;
      const newRemaining = state.timeRemaining - action.delta;
      const newElapsed = Math.min(TOTAL_DURATION, state.totalElapsed + action.delta);
      if (newRemaining > 0) return { ...state, timeRemaining: newRemaining, totalElapsed: newElapsed };
      return advancePhase({ ...state, totalElapsed: newElapsed });
    }
    case 'TOGGLE_PAUSE':
      return { ...state, isPaused: !state.isPaused };
    case 'NEXT': {
      if (state.isComplete) return state;
      const jumped = Math.min(TOTAL_DURATION, state.totalElapsed + state.timeRemaining);
      return advancePhase({ ...state, totalElapsed: jumped });
    }
    case 'PREV': {
      let newIdx = state.exerciseIdx;
      if (state.set === 1 && state.phase === 'work') newIdx = Math.max(0, newIdx - 1);
      let elapsedAtStart = 0;
      for (let i = 0; i < newIdx; i++) {
        const r = ROUTINE[i];
        elapsedAtStart += r.sets * r.workSec + (r.sets - 1) * r.restSec + TRANSITION_SEC;
      }
      return {
        ...state,
        exerciseIdx: newIdx,
        set: 1,
        phase: 'work',
        timeRemaining: ROUTINE[newIdx].workSec,
        totalElapsed: elapsedAtStart,
        isComplete: false,
      };
    }
    case 'RESTART':
      return { ...getInitialState(), isStarted: true };
    case 'TO_HOME':
      return getInitialState();
    default:
      return state;
  }
}
