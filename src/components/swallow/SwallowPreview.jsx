import React, { Suspense } from 'react';
import { SWALLOW_EXERCISES } from '../../data/swallowExercises.js';
import { dosage, perDayLabel } from '../../data/swallowRoutine.js';
import { getDay, useSwallowLog } from '../../swallow/log.js';
import { PreviewModal, ViewerCorners } from '../PreviewModal.jsx';
import { LazyHeadViewer } from './headLoader.js';

export function Loading() {
  return (
    <div className="absolute inset-0 flex items-center justify-center font-mono text-[10px] tracking-[0.3em] text-ink-3 uppercase">
      Cargando…
    </div>
  );
}

// Lo hecho hoy en un ejercicio, en texto corto.
export function todayLabel(item, day) {
  if (item.exerciseId === 'chewing') return day.chewDone ? 'Hecho' : `${Math.floor(day.chewSec / 60)} min`;
  const ex = SWALLOW_EXERCISES[item.exerciseId];
  if (ex.kind === 'reps') return `${day.reps[item.exerciseId] ?? 0} reps`;
  return `${day.sets[item.exerciseId] ?? 0} series`;
}

// Vista previa flotante de un ejercicio de deglución: la lámina en bucle,
// la pauta y un botón para practicar solo ese ejercicio.
export function SwallowPreview({ item, number, onClose, onPractice }) {
  useSwallowLog();
  const ex = SWALLOW_EXERCISES[item.exerciseId];
  const day = getDay();

  return (
    <PreviewModal number={number} title={ex.name} subtitle={ex.target} onClose={onClose}>
      <div className="px-4">
        <div className="relative bg-scope border border-ink overflow-hidden h-[46vh] min-h-[220px] max-h-[420px]">
          <Suspense fallback={<Loading />}>
            <LazyHeadViewer exerciseId={item.exerciseId} mode="demo" modeKey={`preview-${item.exerciseId}`} label="Vista previa" />
          </Suspense>
          <ViewerCorners />
        </div>
      </div>

      <div className="px-4 pt-2.5 pb-4 overflow-y-auto">
        <p className="text-[13px] text-ink-2 leading-snug">{ex.instructions}</p>
        {ex.tip && <p className="text-[12px] text-rest leading-snug mt-1.5">{ex.tip}</p>}
        <div className="grid grid-cols-3 mt-2.5 border border-line">
          {[
            ['Dosis', dosage(item)],
            ['Frecuencia', item.perDay === 1 ? '1×día' : `${item.perDay}×día`],
            ['Hoy', todayLabel(item, day)],
          ].map(([label, value], i) => (
            <div key={label} className={`px-2.5 py-1.5 ${i < 2 ? 'border-r border-line' : ''}`}>
              <div className="font-mono text-[8px] uppercase tracking-[0.3em] text-ink-3">{label}</div>
              <div className="font-display font-semibold text-[15px] uppercase tabular-nums leading-tight mt-0.5">{value}</div>
            </div>
          ))}
        </div>
        {item.note && (
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-3 leading-relaxed mt-2">
            {item.note} {perDayLabel(item)}.
          </p>
        )}
        <button
          onClick={onPractice}
          className="w-full mt-3 border border-ink/50 hover:bg-paper-2 text-ink py-3 font-display font-semibold uppercase tracking-[0.22em] text-[13px] transition-colors"
        >
          Practicar solo este ejercicio
        </button>
      </div>
    </PreviewModal>
  );
}
