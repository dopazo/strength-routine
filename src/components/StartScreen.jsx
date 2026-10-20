import React, { useCallback, useState } from 'react';
import { ROUTINE, TOTAL_DURATION } from '../data/routine.js';
import { EXERCISES } from '../data/exercises.js';
import { ExercisePreview } from './ExercisePreview.jsx';
import { RowChevron } from './PreviewModal.jsx';
import { SwallowHome } from './swallow/SwallowHome.jsx';
import { useTheme } from '../theme.js';
import { Hero, HeroStats, SectionTitle } from './ui.jsx';

const PROGRAMS = [
  { id: 'fuerza', label: 'Fuerza' },
  { id: 'deglucion', label: 'Deglución' },
];

// Selector de programa: control segmentado con un indicador que se desliza.
function ProgramTabs({ value, onChange }) {
  const idx = Math.max(0, PROGRAMS.findIndex((p) => p.id === value));
  return (
    <div role="tablist" aria-label="Programa" className="relative grid grid-cols-2 p-1.5 mb-5 rounded-[1.1rem] bg-paper-2 border border-line-soft">
      <div
        className="absolute top-1.5 bottom-1.5 left-1.5 w-[calc(50%-0.375rem)] rounded-[0.8rem] bg-surface shadow-[var(--elev-2)] transition-transform duration-300 ease-[cubic-bezier(0.3,0.7,0.2,1)]"
        style={{ transform: `translateX(${idx * 100}%)` }}
        aria-hidden="true"
      />
      {PROGRAMS.map((p) => {
        const active = p.id === value;
        return (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(p.id)}
            className={`relative py-3 font-display font-semibold text-[19px] uppercase tracking-[0.08em] transition-colors ${
              active ? 'text-ink' : 'text-ink-2 hover:text-ink'
            }`}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

function ThemeIcon({ dark }) {
  return dark ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
    </svg>
  );
}

function ThemeToggle() {
  const [theme, toggle] = useTheme();
  const dark = theme === 'oscuro';
  return (
    <button
      type="button"
      onClick={toggle}
      className="mt-8 mx-auto flex items-center justify-center gap-2 px-3 py-2 text-ink-2 text-[16px] font-medium underline-offset-4 hover:underline hover:text-ink"
    >
      <ThemeIcon dark={dark} />
      {dark ? 'Usar colores claros' : 'Usar modo oscuro'}
    </button>
  );
}

export function StartScreen({ program, onProgram, onStart, onStartSwallow }) {
  return (
    <div className="min-h-screen app-bg text-ink flex flex-col items-center px-4 py-5 font-sans">
      <div className="w-full max-w-md">
        <ProgramTabs value={program} onChange={onProgram} />
        {program === 'deglucion'
          ? <SwallowHome key="deglucion" onStart={onStartSwallow} />
          : <StrengthHome key="fuerza" onStart={onStart} />}
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
  const totalSets = ROUTINE.reduce((s, r) => s + r.sets, 0);

  return (
    <>
      <Hero kicker="Banda elástica" title="Rutina de fuerza">
        <p className="text-[17px] leading-snug text-ink-2 mt-3">
          La app te guía paso a paso y te avisa con sonidos.
        </p>
        <HeroStats items={[[minutes, 'minutos'], [ROUTINE.length, 'ejercicios'], [totalSets, 'series']]} />
        <button
          onClick={onStart}
          className="btn-primary w-full mt-4 py-[18px] font-display font-semibold uppercase tracking-[0.12em] text-[22px]"
        >
          Comenzar rutina
        </button>
        <p className="text-[15px] text-ink-2 text-center mt-3">
          Necesitas una banda elástica plana y espacio para moverte.
        </p>
      </Hero>

      <SectionTitle title="Los ejercicios" hint="Toca uno para ver cómo se hace." />
      <div className="space-y-4">
        {groups.map(({ phase, items }, g) => (
          <section key={phase} className="rise" style={{ '--i': g }}>
            <h3 className="flex items-center gap-3 text-[15px] font-bold text-blaze px-1">
              {phase}
              <span className="flex-1 h-px bg-line-soft" aria-hidden="true" />
            </h3>
            <ul>
              {items.map((item) => {
                const ex = EXERCISES[item.exerciseId];
                return (
                  <li key={item.dorsal} className="border-b border-line-soft last:border-b-0">
                    <button
                      type="button"
                      onClick={() => setPreview(item)}
                      className="w-full flex items-center gap-3 px-1 py-3 text-left rounded-lg hover:bg-paper-2/60 active:bg-paper-2 transition-colors"
                      aria-label={`Ver cómo se hace: ${ex.name}`}
                    >
                      <span className="w-8 shrink-0 font-display font-semibold text-[26px] leading-none text-ink-3 tabular-nums">
                        {String(item.dorsal).padStart(2, '0')}
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
          </section>
        ))}
      </div>
      {preview && <ExercisePreview item={preview} onClose={closePreview} />}
    </>
  );
}
