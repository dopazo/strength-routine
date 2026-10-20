import React, { useEffect, useRef } from 'react';

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

// Flecha "ver más" de las filas que abren una vista previa.
export function RowChevron() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ink-3" aria-hidden="true">
      <polyline points="9 6 15 12 9 18" />
    </svg>
  );
}

// Ventana flotante de vista previa (se usa para los ejercicios de fuerza y de
// deglución). Se cierra con la X, tocando fuera del recuadro o con Escape.
export function PreviewModal({ title, subtitle, onClose, children }) {
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
        className="preview-panel w-full max-w-md max-h-full flex flex-col bg-paper border-2 border-ink text-ink font-sans shadow-2xl"
      >
        <div className="flex items-start gap-3 px-4 pt-3 pb-2">
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-semibold text-[24px] uppercase tracking-tight leading-tight">
              {title}
            </h2>
            <div className="text-[16px] text-ink-2 mt-0.5 leading-snug">
              {subtitle}
            </div>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            className="-mr-1 flex items-center gap-1 px-2 py-1.5 border-2 border-ink text-ink text-[16px] font-semibold hover:bg-paper-2 transition-colors"
            aria-label="Cerrar vista previa"
          >
            <CloseIcon />
            Cerrar
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
