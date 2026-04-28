import React from 'react';
import { formatTime } from '../utils.js';
import { ROUTINE } from '../data/routine.js';

export function CompleteScreen({ totalElapsed, onRestart, onHome }) {
  const totalSets = ROUTINE.reduce((s, r) => s + r.sets, 0);

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col items-center justify-center px-5 py-8 font-sans">
      <div className="w-full max-w-md">
        <div className="text-center">
          <span className="inline-block px-2.5 py-1 border border-work text-work font-mono text-[10px] uppercase tracking-[0.4em] mb-6">
            Completada
          </span>
          <h1 className="font-display font-bold text-[44px] uppercase tracking-tight leading-none mb-7">
            Buen trabajo
          </h1>
        </div>

        <div className="border border-line mb-6">
          <div className="px-4 pt-3 pb-4 border-b border-line">
            <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-ink-3">Tiempo total</div>
            <div
              className="font-display font-bold tabular-nums leading-none mt-1.5 text-ink"
              style={{ fontSize: '64px', letterSpacing: '-0.02em' }}
            >
              {formatTime(totalElapsed)}
            </div>
          </div>
          <div className="grid grid-cols-2">
            <div className="p-3 border-r border-line">
              <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-ink-3">Ejercicios</div>
              <div className="font-display font-bold text-3xl tabular-nums mt-1.5 leading-none">
                {ROUTINE.length}
              </div>
            </div>
            <div className="p-3">
              <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-ink-3">Series</div>
              <div className="font-display font-bold text-3xl tabular-nums mt-1.5 leading-none">
                {totalSets}
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={onRestart}
          className="w-full bg-blaze hover:bg-[#f06028] text-ink py-4 font-display font-semibold uppercase tracking-[0.25em] text-[15px] mb-2 transition-colors"
        >
          Repetir rutina
        </button>
        <button
          onClick={onHome}
          className="w-full border border-ink/40 hover:bg-paper-2 text-ink py-3 font-display font-semibold uppercase tracking-[0.22em] text-[13px] transition-colors"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
}
