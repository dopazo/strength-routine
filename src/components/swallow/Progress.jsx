import React from 'react';

// Avance del día de un ejercicio: un cuadro por vez que pide la pauta. Con
// rango (Masako 3–4) los cuadros opcionales llevan borde punteado.
export function Progress({ item, n, size = 6, wrap = false }) {
  return (
    <span className={`${wrap ? 'grid grid-cols-2' : 'flex'} ${size > 9 ? 'gap-1' : 'gap-[3px]'}`} aria-hidden="true">
      {Array.from({ length: item.perDay }, (_, i) => {
        const optional = item.minPerDay != null && i >= item.minPerDay;
        return (
          <span
            key={i}
            style={{ width: size, height: size }}
            className={i < n ? 'bg-work' : `${size > 9 ? 'border-2' : 'border'} ${optional ? 'border-dashed border-ink-3' : 'border-line'}`}
          />
        );
      })}
    </span>
  );
}
