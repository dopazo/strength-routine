import React from 'react';
import { formatTime } from '../utils.js';
import { ROUTINE } from '../data/routine.js';

export function CompleteScreen({ totalElapsed, onRestart, onHome }) {
  const totalSets = ROUTINE.reduce((s, r) => s + r.sets, 0);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center px-5 py-8">
      <div className="w-full max-w-md text-center">
        <div className="text-xs font-mono tracking-[0.3em] text-lime-400 uppercase mb-3">Completada</div>
        <h1 className="text-5xl font-light tracking-tight mb-8">Buen trabajo.</h1>

        <div className="bg-neutral-900 rounded-xl p-6 border border-neutral-800 mb-6">
          <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest mb-2">Tiempo total</div>
          <div className="text-5xl font-mono font-light tabular-nums">{formatTime(totalElapsed)}</div>
          <div className="grid grid-cols-2 gap-3 mt-6 pt-6 border-t border-neutral-800">
            <div>
              <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Ejercicios</div>
              <div className="text-2xl font-light mt-1 tabular-nums">{ROUTINE.length}</div>
            </div>
            <div>
              <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Series</div>
              <div className="text-2xl font-light mt-1 tabular-nums">{totalSets}</div>
            </div>
          </div>
        </div>

        <button
          onClick={onRestart}
          className="w-full bg-lime-400 hover:bg-lime-300 text-neutral-950 font-medium py-4 rounded-lg mb-2"
        >
          Repetir rutina
        </button>
        <button
          onClick={onHome}
          className="w-full bg-transparent border border-neutral-800 hover:bg-neutral-900 text-neutral-300 font-medium py-3 rounded-lg"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
}
