import React, { Suspense, useEffect, useRef, useState } from 'react';
import { SWALLOW_EXERCISES } from '../../data/swallowExercises.js';
import { dosage, timesToday } from '../../data/swallowRoutine.js';
import { stageElapsed } from '../../state/swallowReducer.js';
import { sampleExercise } from '../../swallow/motion.js';
import { getDay, useSwallowLog } from '../../swallow/log.js';
import { playCountdownBeep, playPhaseChangeBeep, playSkipBeep } from '../../audio/beeps.js';
import { formatTime } from '../../utils.js';
import { LazyHeadViewer } from './headLoader.js';
import { Loading } from './SwallowPreview.jsx';
import { ExerciseInfo } from '../ui.jsx';

const RELEASE_CUES = new Set(['SUELTA', 'RELAJA']);

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

// Mantiene la pantalla encendida durante la sesión (la masticación dura
// hasta 15 minutos). Si el navegador no lo permite, no pasa nada.
function useWakeLock(active) {
  useEffect(() => {
    if (!active || !navigator.wakeLock) return undefined;
    let lock = null;
    let cancelled = false;
    const acquire = () => {
      if (document.visibilityState !== 'visible') return;
      navigator.wakeLock.request('screen').then((l) => {
        if (cancelled) l.release().catch(() => {});
        else lock = l;
      }).catch(() => {});
    };
    acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', acquire);
      lock?.release().catch(() => {});
    };
  }, [active]);
}

// Pitidos guía: aguantar, cada segundo de la cuenta, soltar; últimos
// segundos de una serie; mínimo de masticación y cambio de lado.
function useBeeps(state, sample, elapsed, item) {
  const prev = useRef({});
  useEffect(() => {
    const p = prev.current;
    const key = `${state.idx}|${state.set}|${state.rep}|${state.stage}`;
    const cur = {
      key,
      cue: sample?.cue ?? '',
      digit: sample?.countdown != null ? Math.ceil(sample.countdown - 0.05) : null,
      side: sample?.side ?? 0,
      left: state.stage === 'work' && !item.maxSec ? Math.ceil(item.workSec - elapsed) : null,
      min: state.stage === 'work' && item.maxSec ? elapsed >= item.workSec : false,
      stage: state.stage,
    };
    if (p.key === key && state.pausedAt == null) {
      if (cur.digit != null && p.digit == null) playPhaseChangeBeep();
      else if (cur.digit != null && p.digit != null && cur.digit < p.digit) playCountdownBeep();
      if (cur.cue !== p.cue && RELEASE_CUES.has(cur.cue)) playPhaseChangeBeep();
      if (cur.cue === 'TRAGA' && p.cue === 'LENGUA AFUERA') playCountdownBeep();
      if (cur.left != null && p.left != null && cur.left < p.left && cur.left >= 1 && cur.left <= 3) playCountdownBeep();
      if (cur.side && p.side && cur.side !== p.side) playSkipBeep();
      if (cur.min && !p.min) playPhaseChangeBeep();
    } else if (p.stage === 'work' && cur.stage !== 'work') {
      // Terminó la serie por tiempo.
      playPhaseChangeBeep();
    }
    prev.current = cur;
  });
}

// Texto del bloque central según la etapa.
function statusOf(state, item, ex, sample, elapsed) {
  const sets = item.sets > 1 ? `Serie ${state.set} de ${item.sets}` : '';
  const join = (...parts) => parts.filter(Boolean).join(' · ');
  if (state.stage === 'intro') {
    return {
      label: 'Cuando estés listo', tone: 'text-ink-2', big: dosage(item), bigSmall: true,
      small: ex.kind === 'reps'
        ? join(item.sets > 1 ? `${item.sets} series` : '', 'Toca el botón para cada repetición')
        : 'Toca «Comenzar»',
    };
  }
  if (state.stage === 'ready') {
    return {
      label: state.rep === 0 ? 'Cuando estés listo' : 'Descansa, a tu ritmo', tone: 'text-rest',
      big: `${state.rep} de ${item.reps}`, small: join(sets, 'Repeticiones hechas'),
    };
  }
  if (state.stage === 'rep') {
    const holding = sample?.countdown != null;
    return {
      label: sample?.cue || '…', tone: sample?.effort ? 'text-work' : 'text-ink-2',
      big: holding ? String(Math.max(1, Math.ceil(sample.countdown - 0.05))) : `${state.rep + 1} de ${item.reps}`,
      small: join(sets, holding ? 'Segundos que faltan' : 'Repetición en curso'),
    };
  }
  if (state.stage === 'rest') {
    return {
      label: 'Descansa, a tu ritmo', tone: 'text-rest',
      big: `${state.set} de ${item.sets}`, small: 'Series hechas · toca cuando estés listo',
    };
  }
  if (state.stage === 'work') {
    const paused = state.pausedAt != null;
    if (item.maxSec) {
      const reached = elapsed >= item.workSec;
      const side = sample?.side > 0 ? 'lado derecho' : sample?.side < 0 ? 'lado izquierdo' : '';
      return {
        label: paused ? 'En pausa' : reached ? 'Mínimo cumplido · sigue si puedes' : join(sample?.cue === 'CAMBIA DE LADO' ? 'Cambia de lado' : 'Mastica', side),
        tone: paused ? 'text-ink-2' : 'text-work',
        big: formatTime(elapsed),
        small: `Mínimo ${Math.round(item.workSec / 60)} min · máximo ${Math.round(item.maxSec / 60)} min`,
        meter: { value: elapsed / item.maxSec, mark: item.workSec / item.maxSec },
      };
    }
    return {
      label: paused ? 'En pausa' : sample?.cue || '', tone: paused ? 'text-ink-2' : 'text-work',
      big: formatTime(Math.max(0, item.workSec - elapsed)), small: join(sets, `${item.workSec} segundos`),
    };
  }
  return { label: '', big: '', small: '' };
}

export function SwallowSession({ state, dispatch }) {
  useSwallowLog();
  const item = state.items[state.idx];
  const ex = SWALLOW_EXERCISES[item.exerciseId];
  const running = state.stage === 'rep' || (state.stage === 'work' && state.pausedAt == null);
  const [now, setNow] = useState(() => Date.now());

  // Reloj de la sesión: 10 veces por segundo mientras algo corre.
  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      dispatch({ type: 'TICK', now: t });
    }, 100);
    return () => clearInterval(id);
  }, [running, dispatch]);

  const t = running ? now : Date.now();
  const elapsed = stageElapsed(state, t);
  const sample = state.stage === 'rep' || state.stage === 'work'
    ? sampleExercise(item.exerciseId, ex, state.stage, elapsed, { duration: item.workSec })
    : null;

  useWakeLock(true);
  useBeeps(state, sample, elapsed, item);

  const status = statusOf(state, item, ex, sample, elapsed);
  const day = getDay();

  // Visor: presentación en bucle, repetición guiada, serie o espera.
  let viewer;
  if (state.stage === 'intro') {
    viewer = { mode: 'demo', modeKey: `intro-${state.idx}` };
  } else if (state.stage === 'rep' || state.stage === 'work') {
    viewer = {
      mode: state.stage, modeKey: `${state.stage}-${state.idx}-${state.set}-${state.rep}`,
      clockStart: state.stageStart, pausedAt: state.pausedAt, duration: item.workSec,
    };
  } else {
    viewer = { mode: 'idle', modeKey: `idle-${state.idx}-${state.set}-${state.rep}` };
  }

  // Progreso dentro del ejercicio (para la barra del encabezado).
  let within = 0;
  if (ex.kind === 'reps') within = ((state.set - 1) * item.reps + state.rep) / (item.sets * item.reps);
  else if (state.stage === 'work') within = Math.min(1, ((state.set - 1) + elapsed / (item.maxSec ?? item.workSec)) / item.sets);
  else within = (state.set - 1) / item.sets;

  let primary;
  if (state.stage === 'intro') primary = { label: 'Comenzar', action: 'GO', style: 'blaze' };
  else if (state.stage === 'ready') primary = { label: 'Siguiente repetición', action: 'GO', style: 'blaze' };
  else if (state.stage === 'rest') primary = { label: `Comenzar serie ${state.set}`, action: 'GO', style: 'blaze' };
  else if (state.stage === 'rep') primary = { label: 'Detener', action: 'STOP_REP', style: 'outline' };
  else if (state.pausedAt != null) primary = { label: 'Reanudar', action: 'TOGGLE_PAUSE', style: 'blaze' };
  else primary = { label: 'Pausar', action: 'TOGGLE_PAUSE', style: 'ink' };

  const canEndSet = (state.stage === 'ready' && state.rep > 0) || state.stage === 'rep' || state.stage === 'work';
  const endLabel = item.maxSec ? 'Terminar' : 'Terminar serie';
  const next = state.items[state.idx + 1];
  const prev = state.items[state.idx - 1];

  // Cuántas veces va hoy este ejercicio, según la pauta.
  const footer = item.maxSec
    ? (day.chewDone ? 'Hoy: listo' : 'Una vez al día')
    : `Hoy: ${timesToday(item, day)} de ${item.perDay}`;

  const primaryClass = {
    blaze: 'btn-primary',
    ink: 'btn-ink',
    outline: 'btn-soft',
  }[primary.style];
  const sideBtn = 'btn-soft flex-1 py-2 flex flex-col items-center justify-center gap-0.5 text-[14px] font-semibold leading-none';

  return (
    <div className="h-[100dvh] app-bg text-ink flex flex-col font-sans overflow-y-auto">
      <div className="w-full max-w-md mx-auto flex flex-col flex-1 min-h-0">
        <header className="px-4 pt-3 pb-2 shrink-0">
          <div className="flex items-center justify-between gap-3 mb-2">
            <button
              onClick={() => dispatch({ type: 'EXIT' })}
              className="text-[16px] font-semibold text-ink-2 hover:text-ink py-1 pr-2"
            >
              ‹ Salir
            </button>
            <span className="text-[16px] font-semibold tabular-nums">
              {state.items.length > 1 ? `Ejercicio ${state.idx + 1} de ${state.items.length}` : 'Práctica'}
            </span>
          </div>
          <div className="flex gap-1" aria-hidden="true">
            {state.items.map((it, i) => (
              <div key={it.exerciseId} className="relative h-2 flex-1 rounded-full bg-paper-2 border border-line-soft overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#E0A03A] to-blaze transition-[width] duration-200"
                  style={{ width: `${(i < state.idx ? 1 : i === state.idx ? within : 0) * 100}%` }}
                />
              </div>
            ))}
          </div>
        </header>

        <div className="px-4 pb-2 flex-1 min-h-[110px] flex flex-col">
          <div className="scope-dark vitrine relative flex-1 overflow-hidden rounded-[1.25rem]">
            <Suspense fallback={<Loading />}>
              <LazyHeadViewer
                exerciseId={item.exerciseId}
                mode={viewer.mode}
                modeKey={viewer.modeKey}
                clockStart={viewer.clockStart ?? null}
                pausedAt={viewer.pausedAt ?? null}
                duration={viewer.duration ?? 0}
              />
            </Suspense>
          </div>
        </div>

        <ExerciseInfo key={item.exerciseId} name={ex.name} text={ex.instructions} tip={ex.tip} />

        <div className="px-4 py-1 shrink-0" aria-live="polite">
          <div className="flex flex-col items-center">
            <span className={`text-[19px] font-bold uppercase tracking-[0.04em] text-center leading-tight ${status.tone}`}>
              {status.label}
            </span>
            <div
              className="font-display font-bold tabular-nums text-ink mt-1 uppercase"
              style={{ fontSize: status.bigSmall ? 'clamp(28px, 5dvh, 36px)' : 'clamp(44px, 8dvh, 60px)', lineHeight: '0.95', letterSpacing: '-0.01em' }}
            >
              {status.big}
            </div>
            {status.meter && (
              <div className="relative w-56 h-2 rounded-full bg-paper-2 border border-line-soft mt-2">
                <div className="absolute inset-y-0 left-0 rounded-full bg-work" style={{ width: `${Math.min(1, status.meter.value) * 100}%` }} />
                <div className="absolute top-[-4px] bottom-[-4px] w-[2px] bg-ink" style={{ left: `${status.meter.mark * 100}%` }} />
              </div>
            )}
            <div className="text-[16px] font-medium text-ink-2 mt-1 tabular-nums text-center leading-snug">
              {status.small}
            </div>
          </div>
        </div>

        <div className="px-4 pt-1 pb-[max(0.75rem,env(safe-area-inset-bottom))] shrink-0">
          <div className="flex items-stretch gap-2">
            <button
              onClick={() => dispatch({ type: 'PREV_EXERCISE' })}
              disabled={!prev && state.stage === 'intro'}
              className={sideBtn}
              aria-label={prev ? `Volver a ${SWALLOW_EXERCISES[prev.exerciseId].name}` : 'Reiniciar este ejercicio'}
            >
              <PrevIcon />
              Atrás
            </button>
            <button
              onClick={() => dispatch({ type: primary.action })}
              className={`flex-[2.4] py-4 font-display font-semibold uppercase flex items-center justify-center text-center leading-tight ${
                primary.label.length > 14 ? 'tracking-[0.02em] text-[18px]' : 'tracking-[0.1em] text-[21px]'
              } ${primaryClass}`}
            >
              {primary.label}
            </button>
            <button
              onClick={() => dispatch({ type: 'NEXT_EXERCISE' })}
              className={sideBtn}
              aria-label={next ? `Saltar a ${SWALLOW_EXERCISES[next.exerciseId].name}` : 'Terminar la sesión'}
            >
              <NextIcon />
              Saltar
            </button>
          </div>
          <div className="flex items-center justify-center mt-1.5 min-h-[40px]">
            {canEndSet ? (
              <button
                onClick={() => dispatch({ type: 'END_SET' })}
                className="px-3 py-2 text-[16px] font-semibold text-ink-2 hover:text-ink underline underline-offset-4"
              >
                {endLabel}
              </button>
            ) : (
              <span className="text-[16px] text-ink-2 tabular-nums">{footer}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
