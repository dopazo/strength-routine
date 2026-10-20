import React, { useCallback, useState } from 'react';
import { ROUTINE, TOTAL_DURATION } from '../data/routine.js';
import { EXERCISES } from '../data/exercises.js';
import { ExercisePreview } from './ExercisePreview.jsx';
import { RowChevron } from './PreviewModal.jsx';
import { SwallowHome } from './swallow/SwallowHome.jsx';
import { useTheme } from '../theme.js';

const PROGRAMS = [
  { id: 'fuerza', label: 'Fuerza' },
  { id: 'deglucion', label: 'Deglución' },
];

// Selector de programa: rutina de fuerza o ejercicios de deglución.
function ProgramTabs({ value, onChange }) {
  return (
    <div role="tablist" aria-label="Programa" className="grid grid-cols-2 border-2 border-ink mb-6">
      {PROGRAMS.map((p, i) => {
        const active = p.id === value;
        return (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(p.id)}
            className={`py-3.5 font-display font-semibold text-[19px] uppercase tracking-[0.08em] transition-colors ${
              i === 0 ? 'border-r-2 border-ink' : ''
            } ${active ? 'bg-ink text-paper' : 'text-ink hover:bg-paper-2'}`}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

function ThemeToggle() {
  const [theme, toggle] = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      className="mt-8 w-full py-3 border-2 border-line text-ink-2 text-[16px] font-medium hover:bg-paper-2 transition-colors"
    >
      {theme === 'oscuro' ? 'Usar colores claros' : 'Usar modo oscuro'}
    </button>
  );
}

export function StartScreen({ program, onProgram, onStart, onStartSwallow }) {
  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col items-center px-4 py-6 font-sans">
      <div className="w-full max-w-md">
        <ProgramTabs value={program} onChange={onProgram} />
        {program === 'deglucion'
          ? <SwallowHome onStart={onStartSwallow} />
          : <StrengthHome onStart={onStart} />}
        <ThemeToggle />
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

  const minutes = Math.round(TOTAL_DURATION / 60);

  return (
    <>
      <h1 className="font-display font-bold text-[40px] uppercase tracking-tight leading-[0.95]">
        Rutina de fuerza
      </h1>
      <p className="text-[18px] leading-snug text-ink-2 mt-3">
        {ROUTINE.length} ejercicios con banda elástica para todo el cuerpo.
        Dura unos <strong className="text-ink">{minutes} minutos</strong>. La app te guía paso a paso y te avisa con sonidos.
      </p>

      <button
        onClick={onStart}
        className="w-full mt-5 bg-blaze hover:brightness-110 text-paper py-5 font-display font-semibold uppercase tracking-[0.12em] text-[22px] transition"
      >
        Comenzar rutina
      </button>
      <p className="text-[16px] text-ink-2 text-center mt-2.5">
        Necesitas una banda elástica plana y espacio para moverte.
      </p>

      <h2 className="font-display font-semibold text-[24px] uppercase tracking-tight mt-8">Los ejercicios</h2>
      <p className="text-[16px] text-ink-2 mt-1 mb-3">Toca uno para ver cómo se hace.</p>
      <div className="space-y-5">
        {groups.map(({ phase, items }) => (
          <div key={phase}>
            <div className="pb-1.5 border-b-2 border-ink">
              <span className="text-[17px] font-bold text-ink">{phase}</span>
            </div>
            <ul>
              {items.map((item) => {
                const ex = EXERCISES[item.exerciseId];
                return (
                  <li key={item.dorsal} className="border-b border-line last:border-b-0">
                    <button
                      type="button"
                      onClick={() => setPreview(item)}
                      className="w-full flex items-center gap-3 py-3 text-left hover:bg-paper-2 active:bg-paper-2 transition-colors"
                      aria-label={`Ver cómo se hace: ${ex.name}`}
                    >
                      <span className="text-[17px] font-semibold text-ink-3 tabular-nums w-6 text-right">
                        {item.dorsal}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[18px] font-semibold leading-tight">{ex.name}</div>
                        <div className="text-[15px] text-ink-2 mt-0.5 leading-snug">
                          {ex.muscles} · {item.sets} series
                        </div>
                      </div>
                      <RowChevron />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      {preview && <ExercisePreview item={preview} onClose={closePreview} />}
    </>
  );
}
