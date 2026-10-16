import React from 'react';
import { SWALLOW_EXERCISES } from '../../data/swallowExercises.js';
import { QUICK_ITEM, SESSIONS_PER_DAY } from '../../data/swallowRoutine.js';
import { getDay, useSwallowLog } from '../../swallow/log.js';
import { formatTime } from '../../utils.js';

// Pantalla final de la sesión de deglución: resumen y lo que queda del día.
export function SwallowComplete({ state, onHome }) {
  useSwallowLog();
  const day = getDay();
  const total = (state.endedAt - state.startedAt) / 1000;
  const quickSets = QUICK_ITEM ? day.sets[QUICK_ITEM.exerciseId] ?? 0 : 0;
  const onlyQuick = state.items.length === 1 && state.items[0].quick;
  const pending = [];
  if (day.sessions < SESSIONS_PER_DAY) {
    const left = SESSIONS_PER_DAY - day.sessions;
    pending.push(left === 1 ? 'Queda 1 sesión hoy' : `Quedan ${left} sesiones hoy`);
  }
  if (QUICK_ITEM && quickSets < QUICK_ITEM.perDay) {
    const left = QUICK_ITEM.perDay - quickSets;
    pending.push(`Masako: ${left === 1 ? 'falta 1 serie' : `faltan ${left} series`} hoy`);
  }
  if (!day.chewDone) pending.push('Falta la masticación de hoy (10–15 min)');

  return (
    <div className="min-h-[100dvh] bg-paper text-ink flex flex-col items-center justify-center px-5 py-8 font-sans">
      <div className="w-full max-w-md">
        <div className="text-center">
          <span className="inline-block px-2.5 py-1 border border-work text-work font-mono text-[10px] uppercase tracking-[0.4em] mb-6">
            {state.full ? 'Sesión completada' : onlyQuick ? 'Serie lista' : 'Práctica lista'}
          </span>
          <h1 className="font-display font-bold text-[44px] uppercase tracking-tight leading-none mb-7">
            Buen trabajo
          </h1>
        </div>

        <div className="border border-line mb-4">
          <div className="px-4 pt-3 pb-4 border-b border-line">
            <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-ink-3">Tiempo</div>
            <div className="font-display font-bold tabular-nums leading-none mt-1.5 text-ink" style={{ fontSize: '64px', letterSpacing: '-0.02em' }}>
              {formatTime(total)}
            </div>
          </div>
          <div className="grid grid-cols-3">
            <div className="p-3 border-r border-line">
              <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-ink-3">Hoy</div>
              <div className="flex items-baseline gap-1 mt-1.5 leading-none">
                <span className="font-display font-bold text-3xl tabular-nums">{day.sessions}</span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-ink-3">/{SESSIONS_PER_DAY} ses.</span>
              </div>
            </div>
            <div className="p-3 border-r border-line">
              <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-ink-3">Masako</div>
              <div className="flex items-baseline gap-1 mt-1.5 leading-none">
                <span className={`font-display font-bold text-3xl tabular-nums ${quickSets >= (QUICK_ITEM?.perDay ?? 0) ? 'text-work' : ''}`}>{quickSets}</span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-ink-3">/{QUICK_ITEM?.perDay} series</span>
              </div>
            </div>
            <div className="p-3">
              <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-ink-3">Chicle</div>
              <div className={`font-display font-bold text-3xl mt-1.5 leading-none ${day.chewDone ? 'text-work' : 'text-ink-3'}`}>
                {day.chewDone ? 'Listo' : '—'}
              </div>
            </div>
          </div>
        </div>

        <ul className="mb-6 space-y-1">
          {Object.entries(state.done).map(([id, d]) => (
            <li key={id} className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-ink-2">
              <span>{SWALLOW_EXERCISES[id].name}</span>
              <span className="tabular-nums text-ink">
                {d.reps ? `${d.reps} ${d.reps === 1 ? 'rep' : 'reps'}` : d.sec ? formatTime(d.sec) : `${d.sets} ${d.sets === 1 ? 'serie' : 'series'}`}
              </span>
            </li>
          ))}
          {(state.done.masako?.reps ?? 0) > 0 && (
            <li className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-3 pt-1">
              Hoy van {day.reps.masako ?? 0} {day.reps.masako === 1 ? 'repetición' : 'repeticiones'} de Masako (anotadas en el registro)
            </li>
          )}
          {pending.map((p) => (
            <li key={p} className="font-mono text-[9px] uppercase tracking-[0.2em] text-trans pt-1">{p}</li>
          ))}
        </ul>

        <button
          onClick={onHome}
          className="w-full bg-blaze hover:bg-[#f06028] text-ink py-4 font-display font-semibold uppercase tracking-[0.25em] text-[15px] transition-colors"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
}
