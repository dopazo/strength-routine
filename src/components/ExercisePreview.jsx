import React, { Suspense, lazy } from 'react';
import { EXERCISES } from '../data/exercises.js';
import { loadViewer } from './viewerLoader.js';
import { PreviewModal } from './PreviewModal.jsx';

// El visor 3D (y Three.js) va en un chunk aparte; ver viewerLoader.js.
const ExerciseViewer = lazy(() => loadViewer().then((m) => ({ default: m.ExerciseViewer })));

// Vista previa flotante de un ejercicio desde la pantalla de inicio: el
// muñeco repite el movimiento en bucle (tempo base) y se puede orbitar igual
// que durante la rutina.
export function ExercisePreview({ item, onClose }) {
  const ex = EXERCISES[item.exerciseId];

  return (
    <PreviewModal title={ex.name} subtitle={ex.muscles} onClose={onClose}>
      <div className="px-3">
        <div className="scope-dark vitrine relative overflow-hidden rounded-[1.25rem] h-[48vh] min-h-[220px] max-h-[440px]">
          <Suspense
            fallback={(
              <div className="absolute inset-0 flex items-center justify-center text-[16px] text-ink-2">
                Cargando…
              </div>
            )}
          >
            <ExerciseViewer exerciseId={item.exerciseId} phase="demo" phaseKey={`preview-${item.dorsal}`} freeRun />
          </Suspense>
          <div className="pointer-events-none absolute top-3 left-4 text-[14px] text-ink-2">
            Desliza el dedo para girar
          </div>
        </div>
      </div>

      <div className="px-5 pt-3 pb-5 overflow-y-auto">
        <p className="text-[17px] text-ink leading-snug">{ex.instructions}</p>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[
            ['Series', `${item.sets} × ${item.workSec} s`],
            ['Repeticiones', String(item.reps).replace('-', '–')],
            ['Descanso', `${item.restSec} s`],
          ].map(([label, value]) => (
            <div key={label} className="px-3 py-2 rounded-xl bg-paper-2 border border-line-soft">
              <div className="text-[14px] text-ink-2">{label}</div>
              <div className="font-display font-semibold text-[21px] tabular-nums leading-tight mt-0.5">{value}</div>
            </div>
          ))}
        </div>
      </div>
    </PreviewModal>
  );
}
