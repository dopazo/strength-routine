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
      <div className="px-4">
        <div className="scope-dark relative bg-scope border-2 border-ink overflow-hidden h-[48vh] min-h-[220px] max-h-[440px]">
          <Suspense
            fallback={(
              <div className="absolute inset-0 flex items-center justify-center text-[16px] text-ink-2">
                Cargando…
              </div>
            )}
          >
            <ExerciseViewer exerciseId={item.exerciseId} phase="demo" phaseKey={`preview-${item.dorsal}`} freeRun />
          </Suspense>
          <div className="pointer-events-none absolute top-2 left-3 text-[14px] text-ink-2">
            Desliza el dedo para girar
          </div>
        </div>
      </div>

      <div className="px-4 pt-2.5 pb-4 overflow-y-auto">
        <p className="text-[17px] text-ink leading-snug">{ex.instructions}</p>
        <div className="grid grid-cols-3 mt-3 border-2 border-line">
          {[
            ['Series', `${item.sets} × ${item.workSec} s`],
            ['Repeticiones', String(item.reps).replace('-', '–')],
            ['Descanso', `${item.restSec} s`],
          ].map(([label, value], i) => (
            <div key={label} className={`px-2.5 py-1.5 ${i < 2 ? 'border-r border-line' : ''}`}>
              <div className="text-[14px] text-ink-2">{label}</div>
              <div className="font-display font-semibold text-[21px] tabular-nums leading-tight mt-0.5">{value}</div>
            </div>
          ))}
        </div>
      </div>
    </PreviewModal>
  );
}
