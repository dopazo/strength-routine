import React, { Suspense } from 'react';
import { SWALLOW_EXERCISES } from '../../data/swallowExercises.js';
import { dosage, perDayLabel, timesToday } from '../../data/swallowRoutine.js';
import { getDay, useSwallowLog } from '../../swallow/log.js';
import { PreviewModal } from '../PreviewModal.jsx';
import { LazyHeadViewer } from './headLoader.js';

export function Loading() {
  return (
    <div className="absolute inset-0 flex items-center justify-center text-[16px] text-ink-2">
      Cargando…
    </div>
  );
}

// Lo hecho hoy en un ejercicio, en texto corto.
function todayLabel(item, day) {
  if (item.maxSec) return day.chewDone ? 'Hecho' : `${Math.floor(day.chewSec / 60)} min`;
  return `${timesToday(item, day)} de ${item.perDay}`;
}

// Vista previa flotante de un ejercicio de deglución: la lámina en bucle,
// la pauta y un botón para practicar solo ese ejercicio.
export function SwallowPreview({ item, onClose, onPractice }) {
  useSwallowLog();
  const ex = SWALLOW_EXERCISES[item.exerciseId];
  const day = getDay();

  return (
    <PreviewModal title={ex.name} subtitle={ex.target} onClose={onClose}>
      <div className="px-4">
        <div className="scope-dark relative bg-scope border-2 border-ink overflow-hidden h-[42vh] min-h-[220px] max-h-[420px]">
          <Suspense fallback={<Loading />}>
            <LazyHeadViewer exerciseId={item.exerciseId} mode="demo" modeKey={`preview-${item.exerciseId}`} label="Vista previa" />
          </Suspense>
        </div>
      </div>

      <div className="px-4 pt-2.5 pb-4 overflow-y-auto">
        <p className="text-[17px] text-ink leading-snug">{ex.instructions}</p>
        {ex.tip && <p className="text-[16px] text-rest leading-snug mt-1.5">{ex.tip}</p>}
        <div className="mt-3 border-2 border-line px-3 py-2">
          <div className="text-[17px] font-semibold leading-snug">{item.note ?? `${dosage(item)}, ${perDayLabel(item)}.`}</div>
          <div className="text-[16px] text-ink-2 mt-1">Hoy: <strong className="text-ink">{todayLabel(item, day)}</strong></div>
        </div>
        <button
          onClick={onPractice}
          className="w-full mt-3 border-2 border-ink hover:bg-paper-2 text-ink py-3.5 font-display font-semibold uppercase tracking-[0.06em] text-[18px] transition-colors"
        >
          Practicar solo este ejercicio
        </button>
      </div>
    </PreviewModal>
  );
}
