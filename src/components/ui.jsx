import React, { useState } from 'react';

// Cinta elástica decorativa (lima → ámbar → naranja, como la banda del visor
// cuando se estira). Se "tensa" al aparecer.
function Ribbon() {
  return (
    <svg
      className="pointer-events-none absolute top-0 right-0 w-[130px] h-[120px] opacity-80"
      viewBox="0 0 130 120"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="ribbon-grad" x1="1" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#A3D125" />
          <stop offset="0.55" stopColor="#E0A03A" />
          <stop offset="1" stopColor="#E8501F" />
        </linearGradient>
      </defs>
      <path className="ribbon" pathLength="1" d="M 14 -6 C 38 40 70 76 136 96" stroke="url(#ribbon-grad)" strokeWidth="9" strokeLinecap="round" />
      <path className="ribbon" pathLength="1" d="M 44 -6 C 64 26 92 50 136 64" stroke="url(#ribbon-grad)" strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}

// Cabecera de cada programa: vitrina oscura (la estética original) con la
// cinta de colores y el contenido encima.
export function Hero({ kicker, title, children }) {
  return (
    <section className="scope-dark vitrine relative overflow-hidden text-ink px-5 pt-5 pb-5">
      <Ribbon />
      <div className="relative">
        <div className="text-[15px] font-semibold text-blaze tracking-[0.04em]">{kicker}</div>
        <h1 className="font-display font-bold text-[40px] uppercase tracking-tight leading-[0.95] mt-1.5 pr-16">
          {title}
        </h1>
        {children}
      </div>
    </section>
  );
}

// Cifras de la cabecera: número grande y rótulo debajo.
export function HeroStats({ items }) {
  return (
    <div className="flex mt-4 mb-1 border-y border-white/10 py-2.5">
      {items.map(([value, label], i) => (
        <div key={label} className={`flex-1 ${i ? 'pl-3 border-l border-white/10' : ''}`}>
          <div className="font-display font-semibold text-[28px] leading-none tabular-nums">{value}</div>
          <div className="text-[14px] text-ink-2 mt-1">{label}</div>
        </div>
      ))}
    </div>
  );
}

// Título de sección sobre una tarjeta.
export function SectionTitle({ title, hint }) {
  return (
    <div className="mt-8 mb-3 px-1">
      <h2 className="font-display font-semibold text-[24px] uppercase tracking-tight leading-none">{title}</h2>
      {hint && <p className="text-[16px] text-ink-2 mt-1.5">{hint}</p>}
    </div>
  );
}

// Marca de "listo" que se dibuja sola (pantallas finales).
export function DoneMark() {
  return (
    <svg width="76" height="76" viewBox="0 0 76 76" fill="none" className="mx-auto text-work" aria-hidden="true">
      <circle cx="38" cy="38" r="34" stroke="currentColor" strokeOpacity="0.18" strokeWidth="5" />
      <circle className="draw" style={{ '--len': 214 }} cx="38" cy="38" r="34" stroke="currentColor" strokeWidth="5" strokeLinecap="round" transform="rotate(-90 38 38)" />
      <polyline className="draw" style={{ '--len': 48, animationDelay: '450ms' }} points="24 39 34 49 53 29" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Nombre e indicaciones del ejercicio en curso. En pantallas de sesión el
// espacio es justo: el texto largo se muestra en 2 líneas y "Leer todo" lo
// despliega (con desplazamiento propio si no cabe), sin empujar los botones
// fuera de la pantalla. Usar con key={id} para que se pliegue al cambiar.
export function ExerciseInfo({ name, text, tip = null }) {
  const [open, setOpen] = useState(false);
  const long = text.length + (tip?.length ?? 0) > 90;
  return (
    <div className="px-4 py-1 shrink-0">
      <h2 className="font-display font-semibold text-[24px] uppercase tracking-tight leading-[1.05] text-ink line-clamp-2">
        {name}
      </h2>
      <div className={`mt-1 ${open ? 'max-h-[28dvh] overflow-y-auto overscroll-contain' : ''}`}>
        <p className={`text-[16px] text-ink-2 leading-snug ${open || !long ? '' : 'line-clamp-2'}`}>{text}</p>
        {tip && (open || !long) && <p className="text-[15px] text-rest mt-1 leading-snug">{tip}</p>}
      </div>
      {long && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="mt-0.5 py-1 text-[15px] font-semibold text-blaze underline underline-offset-4"
        >
          {open ? 'Leer menos' : 'Leer todo'}
        </button>
      )}
    </div>
  );
}
