import React, { useEffect, useRef } from 'react';

const pad2 = (n) => String(n).padStart(2, '0');

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

// Esquinas tipo visor sobre una lámina o animación.
export function ViewerCorners() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-ink/60" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-ink/60" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-ink/60" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-ink/60" />
    </div>
  );
}

// Ventana flotante de vista previa (se usa para los ejercicios de fuerza y de
// deglución). Se cierra con la X, tocando fuera del recuadro o con Escape.
export function PreviewModal({ number, title, subtitle, onClose, children }) {
  // Solo cierra si el toque empezó en el fondo: así, al arrastrar dentro del
  // visor y soltar fuera del recuadro, la vista previa no se cierra.
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
        aria-label={`Vista previa: ${title}`}
        className="preview-panel w-full max-w-md max-h-full flex flex-col bg-paper border border-ink text-ink font-sans shadow-2xl"
      >
        <div className="flex items-start gap-3 px-4 pt-3 pb-2">
          <span className="font-display font-semibold text-[15px] text-ink-2 tabular-nums leading-[1.45]">
            {pad2(number)}
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-semibold text-[20px] uppercase tracking-tight leading-tight">
              {title}
            </h2>
            <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-ink-3 mt-1">
              {subtitle}
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
        {children}
      </div>
    </div>
  );
}
