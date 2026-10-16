import { useEffect, useRef, useSyncExternalStore } from 'react';

// Registro diario de la rutina de deglución, guardado en este dispositivo
// (localStorage). La pauta pide anotar las repeticiones logradas cada día;
// además se cuentan las veces que se completó cada ejercicio (para saber qué
// falta hoy), las sesiones y los minutos de masticación.
//
//   { 'AAAA-MM-DD': { sessions, rounds: { ejercicio: n }, reps: { … }, sets: { … }, chewSec, chewDone } }

const KEY = 'deglucion-registro-v1';
const KEEP_DAYS = 120;
export const CHEW_MIN_SEC = 600;

const pad2 = (n) => String(n).padStart(2, '0');
export function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

let cache = null;
const listeners = new Set();

function load() {
  if (cache) return cache;
  try {
    cache = JSON.parse(window.localStorage.getItem(KEY) ?? '{}') ?? {};
  } catch {
    cache = {};
  }
  return cache;
}

function save(next) {
  // Descarta lo más antiguo para no crecer sin límite.
  const keys = Object.keys(next).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - KEEP_DAYS))) delete next[k];
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Sin almacenamiento (modo privado): el registro vive solo en memoria.
  }
  listeners.forEach((fn) => fn());
}

function update(fn) {
  const all = { ...load() };
  const k = dayKey();
  const day = { sessions: 0, rounds: {}, reps: {}, sets: {}, chewSec: 0, chewDone: false, ...all[k] };
  day.rounds = { ...day.rounds };
  day.reps = { ...day.reps };
  day.sets = { ...day.sets };
  fn(day);
  all[k] = day;
  save(all);
}

export function getDay(key = dayKey()) {
  const d = load()[key] ?? {};
  return {
    sessions: d.sessions ?? 0,
    rounds: d.rounds ?? {},
    reps: d.reps ?? {},
    sets: d.sets ?? {},
    chewSec: d.chewSec ?? 0,
    chewDone: !!d.chewDone || (d.chewSec ?? 0) >= CHEW_MIN_SEC,
  };
}

export const logReps = (exerciseId, n) => n > 0 && update((d) => { d.reps[exerciseId] = (d.reps[exerciseId] ?? 0) + n; });
export const logSets = (exerciseId, n) => n > 0 && update((d) => { d.sets[exerciseId] = (d.sets[exerciseId] ?? 0) + n; });
export const logRounds = (exerciseId, n) => n > 0 && update((d) => { d.rounds[exerciseId] = (d.rounds[exerciseId] ?? 0) + n; });
export const logChew = (sec) => sec > 0 && update((d) => { d.chewSec = Math.round((d.chewSec ?? 0) + sec); });
export const logSession = () => update((d) => { d.sessions = (d.sessions ?? 0) + 1; });
// Marca a mano la masticación de hoy (p. ej. si se hizo fuera de la app).
export const setChewDone = (done) => update((d) => { d.chewDone = done; if (!done) d.chewSec = 0; });

// Últimos `n` días, del más antiguo a hoy.
export function lastDays(n = 7) {
  const out = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    out.push({ key: dayKey(d), date: d, ...getDay(dayKey(d)) });
  }
  return out;
}

function subscribe(fn) {
  listeners.add(fn);
  const onStorage = (e) => {
    if (e.key === KEY) {
      cache = null;
      fn();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener('storage', onStorage);
  };
}

// Pasa al registro lo que va haciendo la sesión (`done` del reducer de
// deglución): repeticiones al momento, así no se pierden aunque la sesión
// quede a medias; cada ejercicio terminado, y la sesión al completarse (si
// se hizo algo: saltar todos los ejercicios no cuenta). Va en App (no en la
// pantalla de sesión) porque esa pantalla se desmonta justo al completar.
export function useSwallowLogSync(state) {
  const prev = useRef({ startedAt: state.startedAt, done: {}, counted: false });
  useEffect(() => {
    if (prev.current.startedAt !== state.startedAt) {
      prev.current = { startedAt: state.startedAt, done: {}, counted: false };
    }
    const last = prev.current.done;
    for (const [id, d] of Object.entries(state.done)) {
      const before = last[id] ?? { reps: 0, sets: 0, sec: 0, rounds: 0 };
      logReps(id, d.reps - before.reps);
      logRounds(id, d.rounds - before.rounds);
      logSets(id, d.sets - before.sets);
      if (id === 'chewing') logChew(d.sec - before.sec);
    }
    prev.current.done = state.done;
    if (state.complete && state.full && !prev.current.counted && Object.keys(state.done).length > 0) {
      prev.current.counted = true;
      logSession();
    }
  }, [state.done, state.complete, state.full, state.startedAt]);
}

// Hook: re-renderiza cuando cambia el registro. Devuelve el objeto completo
// (cambia de identidad con cada escritura).
export function useSwallowLog() {
  return useSyncExternalStore(subscribe, load, load);
}
