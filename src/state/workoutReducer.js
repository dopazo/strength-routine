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

function elapsedAt(exerciseIdx, set, phase) {
  let e = 0;
  for (let i = 0; i < exerciseIdx; i++) {
    const r = ROUTINE[i];
    e += r.sets * r.workSec + (r.sets - 1) * r.restSec + TRANSITION_SEC;
  }
  const r = ROUTINE[exerciseIdx];
  if (phase === 'work') {
    e += (set - 1) * (r.workSec + r.restSec);
  } else if (phase === 'rest') {
    e += set * r.workSec + (set - 1) * r.restSec;
  } else if (phase === 'transition') {
    e += r.sets * r.workSec + (r.sets - 1) * r.restSec;
  }
  return e;
}

function jumpTo(state, exerciseIdx, set, phase) {
  const r = ROUTINE[exerciseIdx];
  let timeRemaining;
  if (phase === 'work') timeRemaining = r.workSec;
  else if (phase === 'rest') timeRemaining = r.restSec;
  else timeRemaining = TRANSITION_SEC;
  return {
    ...state,
    exerciseIdx,
    set,
    phase,
    timeRemaining,
    totalElapsed: elapsedAt(exerciseIdx, set, phase),
    isComplete: false,
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
      const ex = ROUTINE[state.exerciseIdx];
      if (state.phase === 'rest') {
        return jumpTo(state, state.exerciseIdx, state.set, 'work');
      }
      if (state.phase === 'transition') {
        return jumpTo(state, state.exerciseIdx, ex.sets, 'work');
      }
      if (state.set > 1) {
        return jumpTo(state, state.exerciseIdx, state.set - 1, 'work');
      }
      if (state.exerciseIdx > 0) {
        const prev = ROUTINE[state.exerciseIdx - 1];
        return jumpTo(state, state.exerciseIdx - 1, prev.sets, 'work');
      }
      return jumpTo(state, 0, 1, 'work');
    }
    case 'NEXT_EXERCISE': {
      if (state.isComplete) return state;
      if (state.exerciseIdx >= ROUTINE.length - 1) return state;
      return jumpTo(state, state.exerciseIdx + 1, 1, 'work');
    }
    case 'PREV_EXERCISE': {
      if (!(state.set === 1 && state.phase === 'work')) {
        return jumpTo(state, state.exerciseIdx, 1, 'work');
      }
      if (state.exerciseIdx === 0) return state;
      return jumpTo(state, state.exerciseIdx - 1, 1, 'work');
    }
    case 'RESTART':
      return { ...getInitialState(), isStarted: true };
    case 'TO_HOME':
      return getInitialState();
    default:
      return state;
  }
}
