import React from 'react';
import { formatTime } from '../utils.js';
import { ROUTINE } from '../data/routine.js';
import { DoneMark } from './ui.jsx';

export function CompleteScreen({ totalElapsed, onRestart, onHome }) {
  const totalSets = ROUTINE.reduce((s, r) => s + r.sets, 0);

  return (
    <div className="min-h-screen app-bg text-ink flex flex-col items-center justify-center px-5 py-8 font-sans">
      <div className="w-full max-w-md">
        <div className="text-center">
          <DoneMark />
          <span className="inline-block mt-4 px-3.5 py-1 rounded-full border border-work/40 bg-work/12 text-work text-[18px] font-bold mb-3">
            Rutina completada
          </span>
          <h1 className="font-display font-bold text-[44px] uppercase tracking-tight leading-none mb-6">
            Buen trabajo
          </h1>
        </div>

        <div className="scope-dark vitrine text-ink px-5 pt-4 pb-5 mb-3">
            <div className="text-[16px] text-ink-2">Tiempo total</div>
            <div
              className="font-display font-bold tabular-nums leading-none mt-1.5 text-ink"
              style={{ fontSize: '64px', letterSpacing: '-0.02em' }}
            >
              {formatTime(totalElapsed)}
            </div>
        </div>
        <div className="card mb-6">
          <div className="grid grid-cols-2">
            <div className="p-4 border-r border-line-soft">
              <div className="text-[16px] text-ink-2">Ejercicios</div>
              <div className="font-display font-bold text-4xl tabular-nums mt-1.5 leading-none">
                {ROUTINE.length}
              </div>
            </div>
            <div className="p-4">
              <div className="text-[16px] text-ink-2">Series</div>
              <div className="font-display font-bold text-4xl tabular-nums mt-1.5 leading-none">
                {totalSets}
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={onRestart}
          className="btn-primary w-full py-[18px] font-display font-semibold uppercase tracking-[0.12em] text-[22px] mb-3"
        >
          Repetir rutina
        </button>
        <button
          onClick={onHome}
          className="btn-soft w-full py-4 font-display font-semibold uppercase tracking-[0.1em] text-[19px]"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
}
