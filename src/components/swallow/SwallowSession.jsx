import React, { Suspense, useEffect, useRef, useState } from 'react';
import { SWALLOW_EXERCISES } from '../../data/swallowExercises.js';
import { SESSIONS_PER_DAY, dosage } from '../../data/swallowRoutine.js';
import { stageElapsed } from '../../state/swallowReducer.js';
import { sampleExercise } from '../../swallow/motion.js';
import { getDay, useSwallowLog } from '../../swallow/log.js';
import { playCountdownBeep, playPhaseChangeBeep, playSkipBeep } from '../../audio/beeps.js';
import { formatTime } from '../../utils.js';
import { ViewerCorners } from '../PreviewModal.jsx';
import { LazyHeadViewer } from './headLoader.js';
import { Loading } from './SwallowPreview.jsx';

const pad2 = (n) => String(n).padStart(2, '0');
const RELEASE_CUES = new Set(['SUELTA', 'RELAJA']);

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
  const sets = item.sets > 1 ? `SERIE ${pad2(state.set)}/${pad2(item.sets)}` : '';
  const join = (...parts) => parts.filter(Boolean).join(' · ');
  if (state.stage === 'intro') {
    return {
      label: 'Cuando estés listo', tone: 'text-ink-2', big: dosage(item), bigSmall: true,
      small: ex.kind === 'reps' ? join(item.sets > 1 ? `${item.sets} SERIES` : '', 'TOCA PARA CADA REPETICIÓN') : 'TOCA COMENZAR',
    };
  }
  if (state.stage === 'ready') {
    return {
      label: state.rep === 0 ? 'Cuando estés listo' : 'Descansa · a tu ritmo', tone: 'text-rest',
      big: `${pad2(state.rep)}/${pad2(item.reps)}`, small: join(sets, 'REPETICIONES'),
    };
  }
  if (state.stage === 'rep') {
    const holding = sample?.countdown != null;
    return {
      label: sample?.cue || '…', tone: sample?.effort ? 'text-work' : 'text-ink-2',
      big: holding ? String(Math.max(1, Math.ceil(sample.countdown - 0.05))) : `${pad2(state.rep + 1)}/${pad2(item.reps)}`,
      small: join(sets, holding ? 'SEGUNDOS ARRIBA' : 'REPETICIÓN EN CURSO'),
    };
  }
  if (state.stage === 'rest') {
    return {
      label: 'Descansa · a tu ritmo', tone: 'text-rest',
      big: `${pad2(state.set)}/${pad2(item.sets)}`, small: 'PRÓXIMA SERIE · TOCA CUANDO ESTÉS LISTO',
    };
  }
  if (state.stage === 'work') {
    const paused = state.pausedAt != null;
    if (item.maxSec) {
      const reached = elapsed >= item.workSec;
      const side = sample?.side > 0 ? 'LADO DERECHO' : sample?.side < 0 ? 'LADO IZQUIERDO' : '';
      return {
        label: paused ? 'En pausa' : reached ? 'Mínimo cumplido · sigue si puedes' : join(sample?.cue === 'CAMBIA DE LADO' ? 'Cambia de lado' : 'Mastica', side),
        tone: paused ? 'text-ink-2' : 'text-work',
        big: formatTime(elapsed),
        small: `MÍN ${formatTime(item.workSec)} · MÁX ${formatTime(item.maxSec)}`,
        meter: { value: elapsed / item.maxSec, mark: item.workSec / item.maxSec },
      };
    }
    return {
      label: paused ? 'En pausa' : sample?.cue || '', tone: paused ? 'text-ink-2' : 'text-work',
      big: formatTime(Math.max(0, item.workSec - elapsed)), small: join(sets, `${item.workSec}S`),
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

  let footer = state.full ? `SESIÓN · HOY ${day.sessions}/${SESSIONS_PER_DAY}` : 'EJERCICIO SUELTO';
  if (item.quick) footer = `MASAKO HOY · ${day.sets[item.exerciseId] ?? 0}/${item.perDay} SERIES`;

  const primaryClass = {
    blaze: 'bg-blaze text-ink hover:bg-[#f06028]',
    ink: 'bg-ink text-paper hover:bg-[#d8d2c2]',
    outline: 'border border-ink/50 text-ink hover:bg-paper-2',
  }[primary.style];

  return (
    <div className="h-[100dvh] bg-paper text-ink flex flex-col font-sans overflow-hidden">
      <div className="w-full max-w-md mx-auto flex flex-col flex-1 min-h-0">
        <header className="px-5 pt-3 pb-2">
          <div className="flex items-baseline justify-between mb-2">
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-ink-3">Deglución</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink truncate">
                {state.full ? 'Sesión' : item.quick && state.items.length === 1 ? 'Serie suelta' : 'Práctica'}
              </span>
            </div>
            <span className="font-display font-semibold text-ink text-base leading-none tabular-nums">
              {pad2(state.idx + 1)}/{pad2(state.items.length)}
            </span>
          </div>
          <div className="flex gap-1">
            {state.items.map((it, i) => (
              <div key={it.exerciseId} className="relative h-[3px] flex-1 bg-line overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-blaze transition-[width] duration-200"
                  style={{ width: `${(i < state.idx ? 1 : i === state.idx ? within : 0) * 100}%` }}
                />
              </div>
            ))}
          </div>
        </header>

        <div className="px-5 pb-2 flex-1 min-h-[190px] flex flex-col">
          <div className="relative flex-1 bg-scope border border-ink overflow-hidden">
            <Suspense fallback={<Loading />}>
              <LazyHeadViewer
                exerciseId={item.exerciseId}
                mode={viewer.mode}
                modeKey={viewer.modeKey}
                clockStart={viewer.clockStart ?? null}
                pausedAt={viewer.pausedAt ?? null}
                duration={viewer.duration ?? 0}
                label="Lámina"
              />
            </Suspense>
            <ViewerCorners />
          </div>
        </div>

        <div className="px-5 py-1">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display font-semibold text-[22px] uppercase tracking-tight leading-none text-ink truncate">
              {ex.name}
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3 whitespace-nowrap">
              {dosage(item)}
            </span>
          </div>
          <p className="text-[13px] text-ink-2 mt-1.5 leading-snug">{ex.instructions}</p>
          {ex.tip && <p className="text-[12px] text-rest mt-1 leading-snug">{ex.tip}</p>}
        </div>

        <div className="px-5 py-1.5" aria-live="polite">
          <div className="flex flex-col items-center">
            <span className={`font-mono text-[10px] font-medium uppercase tracking-[0.3em] text-center ${status.tone}`}>
              {status.label}
            </span>
            <div
              className="font-display font-bold tabular-nums text-ink mt-1 uppercase"
              style={{ fontSize: status.bigSmall ? '44px' : '64px', lineHeight: '0.9', letterSpacing: '-0.01em' }}
            >
              {status.big}
            </div>
            {status.meter && (
              <div className="relative w-48 h-[3px] bg-line mt-2">
                <div className="absolute inset-y-0 left-0 bg-work" style={{ width: `${Math.min(1, status.meter.value) * 100}%` }} />
                <div className="absolute top-[-3px] bottom-[-3px] w-px bg-ink" style={{ left: `${status.meter.mark * 100}%` }} />
              </div>
            )}
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-3 mt-1.5 tabular-nums text-center">
              {status.small}
            </div>
          </div>
        </div>

        <div className="px-5 pb-3 pt-2">
          <div className="flex items-stretch gap-2">
            <button
              onClick={() => dispatch({ type: 'PREV_EXERCISE' })}
              disabled={!prev && state.stage === 'intro'}
              className="flex-1 py-2.5 border border-ink/40 text-ink hover:bg-paper-2 transition-colors flex items-center justify-center disabled:opacity-30"
              aria-label={prev ? `Volver a ${SWALLOW_EXERCISES[prev.exerciseId].name}` : 'Reiniciar este ejercicio'}
            >
              <PrevIcon />
            </button>
            <button
              onClick={() => dispatch({ type: primary.action })}
              className={`flex-[2.4] py-3.5 font-display font-semibold uppercase flex items-center justify-center text-center leading-tight transition-colors ${
                primary.label.length > 14 ? 'tracking-[0.08em] text-[14px]' : 'tracking-[0.18em] text-[15px]'
              } ${primaryClass}`}
            >
              {primary.label}
            </button>
            <button
              onClick={() => dispatch({ type: 'NEXT_EXERCISE' })}
              className="flex-1 py-2.5 border border-ink/40 text-ink hover:bg-paper-2 transition-colors flex items-center justify-center"
              aria-label={next ? `Saltar a ${SWALLOW_EXERCISES[next.exerciseId].name}` : 'Terminar la sesión'}
            >
              <NextIcon />
            </button>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-line gap-3">
            <button
              onClick={() => dispatch({ type: 'EXIT' })}
              className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-3 hover:text-ink whitespace-nowrap"
            >
              ‹‹ Inicio
            </button>
            {canEndSet ? (
              <button
                onClick={() => dispatch({ type: 'END_SET' })}
                className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-2 hover:text-ink whitespace-nowrap"
              >
                {endLabel} ››
              </button>
            ) : (
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-3 tabular-nums truncate">{footer}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
