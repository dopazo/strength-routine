import React, { Suspense, lazy } from 'react';
import { EXERCISES } from '../data/exercises.js';
import { loadViewer } from './viewerLoader.js';
import { PreviewModal, ViewerCorners } from './PreviewModal.jsx';

// El visor 3D (y Three.js) va en un chunk aparte; ver viewerLoader.js.
const ExerciseViewer = lazy(() => loadViewer().then((m) => ({ default: m.ExerciseViewer })));

// Vista previa flotante de un ejercicio desde la pantalla de inicio: el
// muñeco repite el movimiento en bucle (tempo base) y se puede orbitar igual
// que durante la rutina.
export function ExercisePreview({ item, onClose }) {
  const ex = EXERCISES[item.exerciseId];

  return (
    <PreviewModal number={item.dorsal} title={ex.name} subtitle={ex.muscles} onClose={onClose}>
      <div className="px-4">
        <div className="relative bg-scope border border-ink overflow-hidden h-[52vh] min-h-[220px] max-h-[440px]">
          <Suspense
            fallback={(
              <div className="absolute inset-0 flex items-center justify-center font-mono text-[10px] tracking-[0.3em] text-ink-3 uppercase">
                Cargando…
              </div>
            )}
          >
            <ExerciseViewer exerciseId={item.exerciseId} phase="demo" phaseKey={`preview-${item.dorsal}`} freeRun />
          </Suspense>
          <ViewerCorners />
          <div className="pointer-events-none absolute top-2 left-3 font-mono text-[9px] tracking-[0.25em] text-ink/40">
            VISTA PREVIA · ARRASTRA
          </div>
        </div>
      </div>

      <div className="px-4 pt-2.5 pb-4 overflow-y-auto">
        <p className="text-[13px] text-ink-2 leading-snug">{ex.instructions}</p>
        <div className="grid grid-cols-3 mt-2.5 border border-line">
          {[
            ['Series', `${item.sets}×${item.workSec}s`],
            ['Reps', item.reps],
            ['Descanso', `${item.restSec}s`],
          ].map(([label, value], i) => (
            <div key={label} className={`px-2.5 py-1.5 ${i < 2 ? 'border-r border-line' : ''}`}>
              <div className="font-mono text-[8px] uppercase tracking-[0.3em] text-ink-3">{label}</div>
              <div className="font-display font-semibold text-[15px] uppercase tabular-nums leading-tight mt-0.5">{value}</div>
            </div>
          ))}
        </div>
      </div>
    </PreviewModal>
  );
}
