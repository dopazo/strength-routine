import React from 'react';
import { ROUTINE, TOTAL_DURATION } from '../data/routine.js';
import { EXERCISES } from '../data/exercises.js';

export function StartScreen({ onStart }) {
  const byPhase = ROUTINE.reduce((acc, r) => {
    acc[r.phase] = acc[r.phase] || [];
    acc[r.phase].push(r);
    return acc;
  }, {});

  const totalSets = ROUTINE.reduce((s, r) => s + r.sets, 0);
  const minutes = Math.round(TOTAL_DURATION / 60);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center px-5 py-8">
      <div className="w-full max-w-md">
        <div className="mb-1 text-xs font-mono tracking-[0.3em] text-lime-400 uppercase">Banda Elástica</div>
        <h1 className="text-4xl font-light tracking-tight leading-none mb-1">Rutina de fuerza</h1>
        <div className="text-neutral-500 text-sm">Plan completo · cuerpo entero</div>

        <div className="grid grid-cols-3 gap-2 mt-6 mb-8">
          <div className="bg-neutral-900 rounded-lg p-3 border border-neutral-800">
            <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Duración</div>
            <div className="text-2xl font-light mt-1 tabular-nums">{minutes}<span className="text-sm text-neutral-500 ml-1">min</span></div>
          </div>
          <div className="bg-neutral-900 rounded-lg p-3 border border-neutral-800">
            <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Ejercicios</div>
            <div className="text-2xl font-light mt-1 tabular-nums">{ROUTINE.length}</div>
          </div>
          <div className="bg-neutral-900 rounded-lg p-3 border border-neutral-800">
            <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Series</div>
            <div className="text-2xl font-light mt-1 tabular-nums">{totalSets}</div>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          {Object.entries(byPhase).map(([phase, items]) => (
            <div key={phase}>
              <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-neutral-500 mb-2">{phase}</div>
              <div className="space-y-1.5">
                {items.map((item, idx) => {
                  const ex = EXERCISES[item.exerciseId];
                  return (
                    <div key={idx} className="flex items-center justify-between py-2 px-3 bg-neutral-900/50 rounded-md border border-neutral-800/60">
                      <div>
                        <div className="text-sm">{ex.name}</div>
                        <div className="text-xs text-neutral-500">{ex.muscles}</div>
                      </div>
                      <div className="text-xs font-mono text-neutral-400 tabular-nums">
                        {item.sets}×{item.reps}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onStart}
          className="w-full bg-lime-400 hover:bg-lime-300 text-neutral-950 font-medium py-4 rounded-lg transition-colors text-base tracking-wide"
        >
          Comenzar rutina
        </button>
        <p className="text-xs text-neutral-600 text-center mt-3">
          Necesitas: una banda elástica plana · espacio para moverte
        </p>
      </div>
    </div>
  );
}
