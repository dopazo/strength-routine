import React from 'react';
import { formatTime } from '../utils.js';
import { ROUTINE } from '../data/routine.js';

export function CompleteScreen({ totalElapsed, onRestart, onHome }) {
  const totalSets = ROUTINE.reduce((s, r) => s + r.sets, 0);

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col items-center justify-center px-5 py-8 font-sans">
      <div className="w-full max-w-md">
        <div className="text-center">
          <span className="inline-block px-3 py-1 bg-work text-paper text-[18px] font-bold mb-5">
            Rutina completada
          </span>
          <h1 className="font-display font-bold text-[44px] uppercase tracking-tight leading-none mb-7">
            Buen trabajo
          </h1>
        </div>

        <div className="border-2 border-line mb-6">
          <div className="px-4 pt-3 pb-4 border-b-2 border-line">
            <div className="text-[16px] text-ink-2">Tiempo total</div>
            <div
              className="font-display font-bold tabular-nums leading-none mt-1.5 text-ink"
              style={{ fontSize: '64px', letterSpacing: '-0.02em' }}
            >
              {formatTime(totalElapsed)}
            </div>
          </div>
          <div className="grid grid-cols-2">
            <div className="p-3 border-r-2 border-line">
              <div className="text-[16px] text-ink-2">Ejercicios</div>
              <div className="font-display font-bold text-4xl tabular-nums mt-1.5 leading-none">
                {ROUTINE.length}
              </div>
            </div>
            <div className="p-3">
              <div className="text-[16px] text-ink-2">Series</div>
              <div className="font-display font-bold text-4xl tabular-nums mt-1.5 leading-none">
                {totalSets}
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={onRestart}
          className="w-full bg-blaze hover:brightness-110 text-paper py-5 font-display font-semibold uppercase tracking-[0.12em] text-[22px] mb-3 transition"
        >
          Repetir rutina
        </button>
        <button
          onClick={onHome}
          className="w-full border-2 border-ink hover:bg-paper-2 text-ink py-4 font-display font-semibold uppercase tracking-[0.1em] text-[19px] transition-colors"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
}
