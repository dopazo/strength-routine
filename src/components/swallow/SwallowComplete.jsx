import React from 'react';
import { SWALLOW_ROUTINE, isMet, sessionItems, timesToday } from '../../data/swallowRoutine.js';
import { getDay, useSwallowLog } from '../../swallow/log.js';
import { formatTime } from '../../utils.js';
import { Progress } from './Progress.jsx';

// Pantalla final de la sesión de deglución: lo que se hizo y cómo va el día
// según la pauta.
export function SwallowComplete({ state, onHome }) {
  useSwallowLog();
  const day = getDay();
  const total = (state.endedAt - state.startedAt) / 1000;
  const pending = sessionItems(day);

  return (
    <div className="min-h-[100dvh] bg-paper text-ink flex flex-col items-center justify-center px-5 py-8 font-sans">
      <div className="w-full max-w-md">
        <div className="text-center">
          <span className="inline-block px-2.5 py-1 border border-work text-work font-mono text-[10px] uppercase tracking-[0.4em] mb-6">
            {state.full ? 'Sesión completada' : 'Práctica lista'}
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
          <div className="px-4 py-2.5">
            <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-ink-3 mb-1.5">Pauta de hoy</div>
            <ul className="space-y-1.5">
              {SWALLOW_ROUTINE.map((item) => {
                const n = timesToday(item, day);
                const met = isMet(item, day);
                const now = state.done[item.exerciseId];
                return (
                  <li key={item.exerciseId} className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em]">
                    <span className="flex-1 min-w-0 truncate text-ink-2">{item.short}</span>
                    {now && (
                      <span className="text-ink-3 tabular-nums whitespace-nowrap">
                        {now.reps ? `+${now.reps} ${now.reps === 1 ? 'rep' : 'reps'}` : now.sec ? `+${formatTime(now.sec)}` : ''}
                      </span>
                    )}
                    <Progress item={item} n={n} size={7} />
                    <span className={`w-12 text-right tabular-nums ${met ? 'text-work' : 'text-ink-3'}`}>
                      {met ? 'Listo' : `${n}/${item.perDay}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <p className={`font-mono text-[9px] uppercase tracking-[0.2em] mb-6 leading-relaxed ${pending.length ? 'text-trans' : 'text-work'}`}>
          {pending.length
            ? `Falta hoy · ${pending.map((r) => r.short).join(' · ')}. La próxima vez que abras la app, la sesión trae solo eso.`
            : 'Pauta de hoy completa.'}
          {(day.reps.masako ?? 0) > 0 && (
            <span className="block text-ink-3 mt-1">
              Masako hoy: {day.reps.masako} {day.reps.masako === 1 ? 'repetición lograda' : 'repeticiones logradas'} (en el registro)
            </span>
          )}
        </p>

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
