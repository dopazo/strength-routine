import { SWALLOW_EXERCISES } from '../data/swallowExercises.js';
import { repDuration } from '../swallow/motion.js';

// Sesión de deglución, a ritmo propio: no hay descansos cronometrados; la
// persona toca para empezar cada repetición (o serie) cuando está lista.
//
// Etapas por ejercicio:
//   intro — presentación (la lámina muestra el movimiento en bucle)
//   ready — entre repeticiones: espera el toque
//   rep   — repetición guiada (dura lo que su línea de tiempo)
//   work  — serie por tiempo (cuenta atrás, o hacia arriba con `maxSec`); pausable
//   rest  — entre series: espera el toque
// Al terminar la última serie pasa al `intro` del siguiente ejercicio o a la
// pantalla final. Los tiempos son marcas de Date.now(), así el reloj no se
// atrasa aunque el navegador frene los intervalos.
//
// `done` acumula lo realizado: { ejercicio: { reps, sets, sec } }.

export function initialSwallowState() {
  return {
    active: false,
    complete: false,
    items: [],
    full: false,
    idx: 0,
    set: 1,
    rep: 0,
    stage: 'intro',
    stageStart: 0,
    pausedAt: null,
    startedAt: 0,
    endedAt: 0,
    done: {},
  };
}

export const stageElapsed = (state, now) => (state.stageStart
  ? Math.max(0, ((state.pausedAt ?? now) - state.stageStart) / 1000)
  : 0);

const itemOf = (state) => state.items[state.idx];
const exerciseOf = (state) => SWALLOW_EXERCISES[itemOf(state).exerciseId];

function addDone(done, id, add) {
  const cur = done[id] ?? { reps: 0, sets: 0, sec: 0 };
  return {
    ...done,
    [id]: { reps: cur.reps + (add.reps ?? 0), sets: cur.sets + (add.sets ?? 0), sec: cur.sec + (add.sec ?? 0) },
  };
}

function enterExercise(state, idx) {
  return { ...state, idx, set: 1, rep: 0, stage: 'intro', stageStart: 0, pausedAt: null };
}

function nextExercise(state, now) {
  if (state.idx >= state.items.length - 1) {
    return { ...state, complete: true, stage: 'done', stageStart: 0, pausedAt: null, endedAt: now };
  }
  return enterExercise(state, state.idx + 1);
}

// Cierra la serie actual (completa o cortada antes) y avanza.
function finishSet(state, now) {
  const item = itemOf(state);
  const ex = exerciseOf(state);
  let { done } = state;
  if (ex.kind === 'timed') {
    const sec = Math.min(stageElapsed(state, now), item.maxSec ?? item.workSec);
    done = addDone(done, item.exerciseId, { sets: 1, sec });
  } else if (state.rep > 0) {
    done = addDone(done, item.exerciseId, { sets: 1 });
  }
  const next = { ...state, done, pausedAt: null };
  if (state.set < item.sets) {
    return { ...next, set: state.set + 1, rep: 0, stage: 'rest', stageStart: now };
  }
  return nextExercise(next, now);
}

function begin(state, now) {
  const ex = exerciseOf(state);
  return { ...state, stage: ex.kind === 'timed' ? 'work' : 'rep', stageStart: now, pausedAt: null };
}

export function swallowReducer(state, action) {
  const now = action.now ?? Date.now();
  switch (action.type) {
    case 'START':
      return {
        ...initialSwallowState(), active: true, items: action.items, full: !!action.full, startedAt: now,
      };

    // Botón principal: empezar el ejercicio, la siguiente repetición o la
    // siguiente serie.
    case 'GO':
      if (['intro', 'ready', 'rest'].includes(state.stage)) return begin(state, now);
      return state;

    case 'TICK': {
      if (state.stage === 'rep') {
        const item = itemOf(state);
        if (stageElapsed(state, now) < repDuration(item.exerciseId, exerciseOf(state))) return state;
        const counted = {
          ...state, rep: state.rep + 1, done: addDone(state.done, item.exerciseId, { reps: 1 }),
        };
        if (counted.rep >= item.reps) return finishSet(counted, now);
        return { ...counted, stage: 'ready', stageStart: now };
      }
      if (state.stage === 'work' && state.pausedAt == null) {
        const item = itemOf(state);
        if (stageElapsed(state, now) >= (item.maxSec ?? item.workSec)) return finishSet(state, now);
      }
      return state;
    }

    case 'TOGGLE_PAUSE':
      if (state.stage !== 'work') return state;
      if (state.pausedAt != null) {
        return { ...state, stageStart: state.stageStart + (now - state.pausedAt), pausedAt: null };
      }
      return { ...state, pausedAt: now };

    // Detiene la repetición en curso sin contarla.
    case 'STOP_REP':
      if (state.stage !== 'rep') return state;
      return { ...state, stage: 'ready', stageStart: now };

    // Termina la serie antes (cuenta lo logrado hasta ahora).
    case 'END_SET':
      if (state.stage === 'work') return finishSet(state, now);
      if (state.stage === 'ready' || state.stage === 'rep') return finishSet({ ...state, stage: 'ready' }, now);
      return state;

    case 'NEXT_EXERCISE':
      if (state.complete) return state;
      return nextExercise(state, now);

    case 'PREV_EXERCISE':
      return enterExercise(state, Math.max(0, state.idx - 1));

    case 'EXIT':
      return initialSwallowState();

    default:
      return state;
  }
}
