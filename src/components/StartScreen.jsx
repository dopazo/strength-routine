import React, { useCallback, useState } from 'react';
import { ROUTINE, TOTAL_DURATION } from '../data/routine.js';
import { EXERCISES } from '../data/exercises.js';
import { ExercisePreview } from './ExercisePreview.jsx';
import { SwallowHome } from './swallow/SwallowHome.jsx';

const pad2 = (n) => String(n).padStart(2, '0');

const PROGRAMS = [
  { id: 'fuerza', label: 'Fuerza' },
  { id: 'deglucion', label: 'Deglución' },
];

// Selector de programa: rutina de fuerza o ejercicios de deglución.
function ProgramTabs({ value, onChange }) {
  return (
    <div role="tablist" aria-label="Programa" className="grid grid-cols-2 border border-line mb-6">
      {PROGRAMS.map((p, i) => {
        const active = p.id === value;
        return (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(p.id)}
            className={`py-2.5 flex items-baseline justify-center gap-2 transition-colors ${
              i === 0 ? 'border-r border-line' : ''
            } ${active ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-paper-2 hover:text-ink'}`}
          >
            <span className="font-mono text-[9px] tracking-[0.3em] opacity-60 tabular-nums">{pad2(i + 1)}</span>
            <span className="font-display font-semibold text-[14px] uppercase tracking-[0.2em]">{p.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function StartScreen({ program, onProgram, onStart, onStartSwallow }) {
  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col items-center px-5 py-7 font-sans">
      <div className="w-full max-w-md">
        <ProgramTabs value={program} onChange={onProgram} />
        {program === 'deglucion'
          ? <SwallowHome onStart={onStartSwallow} />
          : <StrengthHome onStart={onStart} />}
      </div>
    </div>
  );
}

function StrengthHome({ onStart }) {
  const [preview, setPreview] = useState(null);
  const closePreview = useCallback(() => setPreview(null), []);
  const groups = [];
  const phaseIndex = new Map();
  ROUTINE.forEach((r, i) => {
    if (!phaseIndex.has(r.phase)) {
      phaseIndex.set(r.phase, groups.length);
      groups.push({ phase: r.phase, items: [] });
    }
    groups[phaseIndex.get(r.phase)].items.push({ ...r, dorsal: i + 1 });
  });

  const totalSets = ROUTINE.reduce((s, r) => s + r.sets, 0);
  const minutes = Math.round(TOTAL_DURATION / 60);

  return (
    <>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] tracking-[0.32em] text-blaze uppercase">Banda Elástica</span>
        <span className="font-mono text-[10px] tracking-[0.3em] text-ink-3 uppercase">Programa · 01</span>
      </div>
      <h1 className="font-display font-bold text-[44px] uppercase tracking-tight leading-[0.95] mt-2">
        Rutina<br/>de fuerza
      </h1>
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-3 mt-3">
        Plan completo · cuerpo entero
      </div>

      <div className="grid grid-cols-3 mt-5 mb-7 border border-line">
        <div className="p-3 border-r border-line">
          <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-ink-3">Duración</div>
          <div className="flex items-baseline gap-1 mt-1.5 leading-none">
            <span className="font-display font-bold text-3xl tabular-nums">{minutes}</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-3">min</span>
          </div>
        </div>
        <div className="p-3 border-r border-line">
          <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-ink-3">Ejercicios</div>
          <div className="font-display font-bold text-3xl tabular-nums mt-1.5 leading-none">{ROUTINE.length}</div>
        </div>
        <div className="p-3">
          <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-ink-3">Series</div>
          <div className="font-display font-bold text-3xl tabular-nums mt-1.5 leading-none">{totalSets}</div>
        </div>
      </div>

      <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-ink-3 mb-3">
        Toca un ejercicio para ver su animación
      </div>
      <div className="space-y-4 mb-7">
        {groups.map(({ phase, items }) => (
          <div key={phase}>
            <div className="flex items-baseline justify-between pb-1.5 mb-1 border-b border-line">
              <span className="font-display font-semibold text-[15px] uppercase tracking-[0.12em] text-ink">
                {phase}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-ink-3 tabular-nums">
                {items.length} {items.length === 1 ? 'EJER' : 'EJER'}
              </span>
            </div>
            <ul>
              {items.map((item) => {
                const ex = EXERCISES[item.exerciseId];
                return (
                  <li key={item.dorsal} className="border-b border-line/50 last:border-b-0">
                    <button
                      type="button"
                      onClick={() => setPreview(item)}
                      className="w-full flex items-center gap-3 py-2 text-left hover:bg-paper-2 active:bg-paper-2 transition-colors"
                      aria-label={`Ver vista previa de ${ex.name}`}
                    >
                      <span className="font-display font-semibold text-[15px] text-ink-2 tabular-nums w-7 leading-none">
                        {pad2(item.dorsal)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] leading-tight truncate">{ex.name}</div>
                        <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-ink-3 mt-0.5 truncate">
                          {ex.muscles}
                        </div>
                      </div>
                      <div className="font-mono text-[11px] text-ink-2 tabular-nums whitespace-nowrap">
                        {item.sets}×{item.workSec}S
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <button
        onClick={onStart}
        className="w-full bg-blaze hover:bg-[#f06028] text-ink py-4 font-display font-semibold uppercase tracking-[0.25em] text-[15px] flex items-center justify-center gap-3 transition-colors"
      >
        <span>Comenzar rutina</span>
        <span className="font-mono text-xs translate-y-[-1px]">››</span>
      </button>
      <p className="font-mono text-[9px] text-ink-3 text-center mt-3 uppercase tracking-[0.22em]">
        Necesitas · banda elástica plana · espacio para moverte
      </p>
      {preview && <ExercisePreview item={preview} onClose={closePreview} />}
    </>
  );
}
