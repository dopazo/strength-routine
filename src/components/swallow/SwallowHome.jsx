import React, { useCallback, useState } from 'react';
import { SWALLOW_EXERCISES } from '../../data/swallowExercises.js';
import { QUICK_ITEM, SESSIONS_PER_DAY, SWALLOW_ROUTINE, dosage } from '../../data/swallowRoutine.js';
import { getDay, lastDays, setChewDone, useSwallowLog } from '../../swallow/log.js';
import { SwallowPreview } from './SwallowPreview.jsx';

const pad2 = (n) => String(n).padStart(2, '0');
const WEEKDAY = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

function Check({ on }) {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" className={on ? 'text-work' : 'text-line'}>
      {on ? <polyline points="4 12 10 18 20 6" /> : <line x1="6" y1="12" x2="18" y2="12" />}
    </svg>
  );
}

function Dots({ n, of, size = 6 }) {
  return Array.from({ length: of }, (_, i) => (
    <span
      key={i}
      style={{ width: size, height: size }}
      className={i < n ? 'bg-work' : 'border border-line'}
    />
  ));
}

// Serie suelta de Masako: cada vez que se abre la app se hace una, hasta la
// meta diaria. Va arriba para que esté a mano apenas se abre.
function QuickSeries({ item, day, onStart }) {
  const ex = SWALLOW_EXERCISES[item.exerciseId];
  const sets = day.sets[item.exerciseId] ?? 0;
  const reps = day.reps[item.exerciseId] ?? 0;
  const met = sets >= item.perDay;
  return (
    <div className="border border-line mb-4">
      <div className="flex items-baseline justify-between px-3 pt-2 pb-1.5 border-b border-line">
        <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-ink-3">{ex.name} · hoy</span>
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-3 tabular-nums">
          {reps} {reps === 1 ? 'rep lograda' : 'reps logradas'}
        </span>
      </div>
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1 leading-none">
            <span className={`font-display font-bold text-3xl tabular-nums ${met ? 'text-work' : ''}`}>{sets}</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-3">/{item.perDay} series</span>
          </div>
          <div className="flex gap-[4px] mt-2" aria-hidden="true"><Dots n={sets} of={item.perDay} size={8} /></div>
        </div>
        <button
          onClick={onStart}
          className="shrink-0 border border-blaze text-ink hover:bg-blaze/15 active:bg-blaze/25 px-3.5 py-2.5 font-display font-semibold uppercase tracking-[0.16em] text-[13px] leading-tight text-center transition-colors"
        >
          {met ? 'Otra serie' : 'Hacer una serie'}
          <span className="block font-mono text-[9px] tracking-[0.2em] text-ink-3 mt-0.5">{dosage(item)}</span>
        </button>
      </div>
    </div>
  );
}

// Registro de los últimos 7 días: lo que la pauta pide anotar (repeticiones
// de Masako) más sesiones y masticación, para mostrárselo al fonoaudiólogo.
function WeekLog() {
  const days = lastDays(7);
  const cell = 'flex items-center justify-center h-6 tabular-nums';
  return (
    <div className="border border-line mb-6">
      <div className="flex items-baseline justify-between px-3 pt-2 pb-1.5 border-b border-line">
        <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-ink-3">Registro · 7 días</span>
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-3">en este dispositivo</span>
      </div>
      <div className="grid grid-cols-[64px_repeat(7,1fr)] px-2 py-1.5 font-mono text-[10px]">
        <span />
        {days.map((d, i) => (
          <span key={d.key} className={`${cell} flex-col h-8 leading-none ${i === 6 ? 'text-ink' : 'text-ink-3'}`}>
            <span className="text-[9px] tracking-[0.2em]">{WEEKDAY[d.date.getDay()]}</span>
            <span className="mt-1 text-[10px]">{d.date.getDate()}</span>
          </span>
        ))}
        <span className="flex items-center h-6 text-[8px] uppercase tracking-[0.2em] text-ink-3">Sesiones</span>
        {days.map((d) => (
          <span key={d.key} className={`${cell} gap-[3px]`} aria-label={`${d.sessions} sesiones`}>
            <Dots n={d.sessions} of={SESSIONS_PER_DAY} />
          </span>
        ))}
        {QUICK_ITEM && (
          <>
            <span className="flex flex-col justify-center h-10 text-[8px] uppercase tracking-[0.2em] text-ink-3 leading-tight">
              Masako
              <span className="text-[7px] tracking-[0.15em]">series · reps</span>
            </span>
            {days.map((d) => {
              const sets = d.sets[QUICK_ITEM.exerciseId] ?? 0;
              const reps = d.reps[QUICK_ITEM.exerciseId] ?? 0;
              return (
                <span key={d.key} className="flex flex-col items-center justify-center h-10 gap-1 tabular-nums" aria-label={`${sets} series, ${reps} repeticiones`}>
                  <span className="grid grid-cols-2 gap-[2px]"><Dots n={sets} of={QUICK_ITEM.perDay} size={5} /></span>
                  <span className={`text-[9px] leading-none ${reps ? 'text-ink' : 'text-line'}`}>{reps || '–'}</span>
                </span>
              );
            })}
          </>
        )}
        <span className="flex items-center h-6 text-[8px] uppercase tracking-[0.2em] text-ink-3">Chicle</span>
        {days.map((d, i) => (i === 6 ? (
          // Hoy se puede marcar a mano (si se masticó chicle fuera de la app).
          <button
            key={d.key}
            type="button"
            onClick={() => setChewDone(!d.chewDone)}
            className={`${cell} hover:bg-paper-2`}
            aria-label={d.chewDone ? 'Desmarcar la masticación de hoy' : 'Marcar la masticación de hoy como hecha'}
            aria-pressed={d.chewDone}
          >
            <Check on={d.chewDone} />
          </button>
        ) : (
          <span key={d.key} className={cell}><Check on={d.chewDone} /></span>
        )))}
      </div>
    </div>
  );
}

// Contenido de la pestaña "Deglución" de la pantalla de inicio.
export function SwallowHome({ onStart }) {
  useSwallowLog();
  const [preview, setPreview] = useState(null);
  const closePreview = useCallback(() => setPreview(null), []);
  const today = getDay();
  const sessionsLeft = Math.max(0, SESSIONS_PER_DAY - today.sessions);
  const items = SWALLOW_ROUTINE.map((r, i) => ({ ...r, number: i + 1 }));

  return (
    <>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] tracking-[0.32em] text-blaze uppercase">Fonoaudiología</span>
        <span className="font-mono text-[10px] tracking-[0.3em] text-ink-3 uppercase">Programa · 02</span>
      </div>
      <h1 className="font-display font-bold text-[44px] uppercase tracking-tight leading-[0.95] mt-2">
        Rutina de<br />deglución
      </h1>
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-3 mt-3">
        Todos los días · mañana y tarde
      </div>

      <div className="grid grid-cols-3 mt-5 mb-4 border border-line">
        <div className="p-3 border-r border-line">
          <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-ink-3">Al día</div>
          <div className="flex items-baseline gap-1 mt-1.5 leading-none">
            <span className="font-display font-bold text-3xl tabular-nums">{SESSIONS_PER_DAY}</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-3">veces</span>
          </div>
        </div>
        <div className="p-3 border-r border-line">
          <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-ink-3">Ejercicios</div>
          <div className="font-display font-bold text-3xl tabular-nums mt-1.5 leading-none">{SWALLOW_ROUTINE.length}</div>
        </div>
        <div className="p-3">
          <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-ink-3">Hoy</div>
          <div className="flex items-baseline gap-1 mt-1.5 leading-none">
            <span className={`font-display font-bold text-3xl tabular-nums ${sessionsLeft === 0 ? 'text-work' : ''}`}>
              {Math.min(today.sessions, 9)}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-3">/{SESSIONS_PER_DAY}</span>
          </div>
        </div>
      </div>

      {QUICK_ITEM && (
        <QuickSeries item={QUICK_ITEM} day={today} onStart={() => onStart({ full: false, only: QUICK_ITEM.exerciseId })} />
      )}

      <WeekLog />

      <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-ink-3 mb-3">
        Toca un ejercicio para ver su animación
      </div>
      <div className="flex items-baseline justify-between pb-1.5 mb-1 border-b border-line">
        <span className="font-display font-semibold text-[15px] uppercase tracking-[0.12em] text-ink">Musculatura de la deglución</span>
        <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-ink-3 tabular-nums">{items.length} EJER</span>
      </div>
      <ul className="mb-6">
        {items.map((item) => {
          const ex = SWALLOW_EXERCISES[item.exerciseId];
          const once = item.perDay === 1;
          const doneToday = once && today.chewDone;
          const quickSets = item.quick ? today.sets[item.exerciseId] ?? 0 : 0;
          return (
            <li key={item.exerciseId} className="border-b border-line/50 last:border-b-0">
              <button
                type="button"
                onClick={() => setPreview(item)}
                className="w-full flex items-center gap-3 py-2 text-left hover:bg-paper-2 active:bg-paper-2 transition-colors"
                aria-label={`Ver vista previa de ${ex.name}`}
              >
                <span className="font-display font-semibold text-[15px] text-ink-2 tabular-nums w-7 leading-none">
                  {pad2(item.number)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] leading-tight truncate">{ex.name}</div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-ink-3 mt-0.5 truncate">
                    {ex.target}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <span className="font-mono text-[11px] text-ink-2 tabular-nums whitespace-nowrap">{dosage(item)}</span>
                  <span className={`font-mono text-[8px] uppercase tracking-[0.2em] whitespace-nowrap ${doneToday || quickSets >= item.perDay ? 'text-work' : 'text-ink-3'}`}>
                    {doneToday ? 'Hecho hoy' : item.quick ? `${quickSets}/${item.perDay} hoy` : `${item.perDay}×día`}
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      <button
        onClick={() => onStart({ full: true })}
        className="w-full bg-blaze hover:bg-[#f06028] text-ink py-4 font-display font-semibold uppercase tracking-[0.25em] text-[15px] flex items-center justify-center gap-3 transition-colors"
      >
        <span>Comenzar sesión</span>
        <span className="font-mono text-xs translate-y-[-1px]">››</span>
      </button>
      <p className="font-mono text-[9px] text-ink-3 text-center mt-3 uppercase tracking-[0.22em]">
        {sessionsLeft > 0
          ? `Hoy ${sessionsLeft === 1 ? 'queda 1 sesión' : `quedan ${sessionsLeft} sesiones`}${today.chewDone ? ' · masticación lista' : ''}`
          : 'Sesiones de hoy completas'}
      </p>
      <p className="font-mono text-[9px] text-ink-3 text-center mt-1.5 uppercase tracking-[0.22em]">
        Ten a mano · un vaso de agua · chicle
      </p>

      {preview && (
        <SwallowPreview
          item={preview}
          number={preview.number}
          onClose={closePreview}
          onPractice={() => { closePreview(); onStart({ full: false, only: preview.exerciseId }); }}
        />
      )}
    </>
  );
}
