import React, { Suspense, lazy, useEffect, useRef } from 'react';
import { EXERCISES } from '../data/exercises.js';
import { loadViewer } from './viewerLoader.js';

// El visor 3D (y Three.js) va en un chunk aparte; ver viewerLoader.js.
const ExerciseViewer = lazy(() => loadViewer().then((m) => ({ default: m.ExerciseViewer })));

const pad2 = (n) => String(n).padStart(2, '0');

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

// Vista previa flotante de un ejercicio desde la pantalla de inicio: el
// muñeco repite el movimiento en bucle (tempo base) y se puede orbitar igual
// que durante la rutina. Se cierra con la X, tocando fuera del recuadro o
// con Escape.
export function ExercisePreview({ item, onClose }) {
  const ex = EXERCISES[item.exerciseId];
  // Solo cierra si el toque empezó en el fondo: así, al orbitar arrastrando
  // y soltar fuera del recuadro, la vista previa no se cierra.
  const downOnBackdrop = useRef(false);
  const closeRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="preview-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6"
      onPointerDown={(e) => { downOnBackdrop.current = e.target === e.currentTarget; }}
      onClick={(e) => {
        if (downOnBackdrop.current && e.target === e.currentTarget) onClose();
        downOnBackdrop.current = false;
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Vista previa: ${ex.name}`}
        className="preview-panel w-full max-w-md max-h-full flex flex-col bg-paper border border-ink text-ink font-sans shadow-2xl"
      >
        <div className="flex items-start gap-3 px-4 pt-3 pb-2">
          <span className="font-display font-semibold text-[15px] text-ink-2 tabular-nums leading-[1.45]">
            {pad2(item.dorsal)}
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-semibold text-[20px] uppercase tracking-tight leading-tight">
              {ex.name}
            </h2>
            <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-ink-3 mt-1">
              {ex.muscles}
            </div>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            className="-mr-1.5 -mt-0.5 p-1.5 text-ink-2 hover:text-ink transition-colors"
            aria-label="Cerrar vista previa"
          >
            <CloseIcon />
          </button>
        </div>

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
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-ink/60" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-ink/60" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-ink/60" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-ink/60" />
            </div>
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
      </div>
    </div>
  );
}
