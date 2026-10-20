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
          <span className="inline-block px-3 py-1 bg-work text-paper text-[18px] font-bold mb-5">
            {state.full ? 'Sesión completada' : 'Práctica lista'}
          </span>
          <h1 className="font-display font-bold text-[44px] uppercase tracking-tight leading-none mb-7">
            Buen trabajo
          </h1>
        </div>

        <div className="border-2 border-line mb-4">
          <div className="px-4 pt-3 pb-4 border-b-2 border-line">
            <div className="text-[16px] text-ink-2">Tiempo de la sesión</div>
            <div className="font-display font-bold tabular-nums leading-none mt-1.5 text-ink" style={{ fontSize: '64px', letterSpacing: '-0.02em' }}>
              {formatTime(total)}
            </div>
          </div>
          <div className="px-4 py-2.5">
            <div className="text-[16px] text-ink-2 mb-2">Cómo va el día</div>
            <ul className="space-y-2.5">
              {SWALLOW_ROUTINE.map((item) => {
                const n = timesToday(item, day);
                const met = isMet(item, day);
                const now = state.done[item.exerciseId];
                return (
                  <li key={item.exerciseId} className="flex items-center gap-3 text-[17px]">
                    <span className="flex-1 min-w-0 truncate font-semibold">{item.short}</span>
                    {now && (
                      <span className="text-[15px] text-ink-2 tabular-nums whitespace-nowrap">
                        {now.reps ? `+${now.reps} ${now.reps === 1 ? 'rep.' : 'reps.'}` : now.sec ? `+${formatTime(now.sec)}` : ''}
                      </span>
                    )}
                    <Progress item={item} n={n} size={12} />
                    <span className={`w-16 text-right font-semibold tabular-nums ${met ? 'text-work' : 'text-ink-2'}`}>
                      {met ? '✓ Listo' : `${n} de ${item.perDay}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <p className={`text-[17px] font-medium mb-6 leading-snug ${pending.length ? 'text-trans' : 'text-work'}`}>
          {pending.length
            ? `Falta hoy: ${pending.map((r) => r.short).join(', ')}. La próxima vez que abras la app, la sesión trae solo eso.`
            : 'Hiciste todo lo de hoy.'}
          {(day.reps.masako ?? 0) > 0 && (
            <span className="block text-[16px] font-normal text-ink-2 mt-1.5">
              Masako hoy: {day.reps.masako} {day.reps.masako === 1 ? 'repetición lograda' : 'repeticiones logradas'} (en el registro)
            </span>
          )}
        </p>

        <button
          onClick={onHome}
          className="w-full bg-blaze hover:brightness-110 text-paper py-5 font-display font-semibold uppercase tracking-[0.12em] text-[22px] transition"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
}
