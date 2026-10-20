import React, { useCallback, useState } from 'react';
import { SWALLOW_EXERCISES } from '../../data/swallowExercises.js';
import {
  SWALLOW_ROUTINE, dosage, isMet, perDayLabel, sessionItems, timesToday,
} from '../../data/swallowRoutine.js';
import { getDay, lastDays, setChewDone, useSwallowLog } from '../../swallow/log.js';
import { SwallowPreview } from './SwallowPreview.jsx';
import { Progress } from './Progress.jsx';
import { RowChevron } from '../PreviewModal.jsx';
import { Hero, SectionTitle } from '../ui.jsx';

// "a, b y c".
const listJoin = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`);

const WEEKDAY = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

function Check({ on }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" className={on ? 'text-work' : 'text-ink-3'}>
      {on ? <polyline points="4 12 10 18 20 6" /> : <line x1="6" y1="12" x2="18" y2="12" />}
    </svg>
  );
}

// Registro de los últimos 7 días, un renglón por ejercicio de la pauta (y
// las repeticiones de Masako, que la pauta pide anotar), para mostrárselo al
// fonoaudiólogo. Va plegado para no recargar la pantalla.
function WeekLog() {
  const days = lastDays(7);
  const cell = 'flex flex-col items-center justify-center gap-1 h-9 tabular-nums';
  const label = 'flex flex-col justify-center h-9 text-[14px] font-medium text-ink leading-tight';
  return (
    <details className="group mt-8 border-y border-line-soft rise" style={{ '--i': 2 }}>
      <summary className="flex items-center justify-between gap-3 px-1 py-3.5 cursor-pointer list-none select-none">
        <span>
          <span className="block text-[17px] font-semibold">Registro de la semana</span>
          <span className="block text-[15px] text-ink-2">Para mostrarle al fonoaudiólogo</span>
        </span>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ink-2 transition-transform group-open:rotate-180" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </summary>
      <div className="grid grid-cols-[92px_repeat(7,1fr)] pb-2 pt-1">
        <span />
        {days.map((d, i) => (
          <span key={d.key} className={`flex flex-col items-center justify-center h-11 leading-none ${i === 6 ? 'text-ink font-bold' : 'text-ink-2'}`}>
            <span className="text-[13px]">{WEEKDAY[d.date.getDay()]}</span>
            <span className="mt-1 text-[15px]">{d.date.getDate()}</span>
          </span>
        ))}
        {SWALLOW_ROUTINE.map((item) => {
          // Masako: además de las series, las repeticiones logradas.
          const showReps = Boolean(item.reps && item.minPerDay);
          return (
            <React.Fragment key={item.exerciseId}>
              <span className={`${label} ${showReps ? 'h-12' : ''}`}>
                {item.short}
                {showReps && <span className="text-[13px] font-normal text-ink-2">y repeticiones</span>}
              </span>
              {days.map((d, i) => {
                if (item.maxSec) {
                  // Hoy se puede marcar a mano (si se masticó chicle fuera de la app).
                  return i === 6 ? (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => setChewDone(!d.chewDone)}
                      className={`${cell} rounded-lg border-2 border-dashed border-line hover:bg-paper-2`}
                      aria-label={d.chewDone ? 'Desmarcar la masticación de hoy' : 'Marcar la masticación de hoy como hecha'}
                      aria-pressed={d.chewDone}
                    >
                      <Check on={d.chewDone} />
                    </button>
                  ) : (
                    <span key={d.key} className={cell}><Check on={d.chewDone} /></span>
                  );
                }
                const n = timesToday(item, d);
                const reps = d.reps[item.exerciseId] ?? 0;
                return (
                  <span
                    key={d.key}
                    className={`${cell} ${showReps ? 'h-12' : ''}`}
                    aria-label={`${item.short}: ${n} de ${item.perDay}${showReps ? `, ${reps} repeticiones` : ''}`}
                  >
                    <Progress item={item} n={n} size={8} wrap={item.perDay > 3} />
                    {showReps && <span className={`text-[14px] leading-none ${reps ? 'text-ink font-semibold' : 'text-ink-3'}`}>{reps || '–'}</span>}
                  </span>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
      <p className="px-1 pb-3.5 text-[14px] text-ink-2 leading-snug">
        Se guarda solo en este teléfono. Si masticaste chicle sin la app, toca el cuadro de hoy en «Chicle».
      </p>
    </details>
  );
}

// Contenido de la pestaña "Deglución" de la pantalla de inicio. Al abrir la
// app la persona hace en ese momento lo que le falta del día según la pauta.
export function SwallowHome({ onStart }) {
  useSwallowLog();
  const [preview, setPreview] = useState(null);
  const closePreview = useCallback(() => setPreview(null), []);
  const today = getDay();
  const items = SWALLOW_ROUTINE.map((r, i) => ({ ...r, number: i + 1 }));
  const pending = sessionItems(today);

  return (
    <>
      <Hero kicker="Fonoaudiología" title="Rutina de deglución">
        <p className="text-[17px] leading-snug text-ink-2 mt-3">
          Cada vez que abras la app, haz una sesión: trae solo lo que te falta hoy.
        </p>
        {pending.length > 0 ? (
          <>
            <button
              onClick={() => onStart({ full: true })}
              className="btn-primary w-full mt-4 py-[18px] font-display font-semibold uppercase tracking-[0.12em] text-[22px]"
            >
              Comenzar sesión
            </button>
            <p className="text-[15px] text-ink-2 text-center mt-3 leading-snug">
              Esta sesión trae: <strong className="text-ink">{listJoin(pending.map((r) => r.short))}</strong>.
              <br />Ten a mano un vaso de agua y un chicle.
            </p>
          </>
        ) : (
          <div className="mt-4 rounded-2xl border border-work/50 bg-work/10 text-center px-3 py-4">
            <div className="font-display font-semibold uppercase tracking-[0.08em] text-[22px] text-work">✓ Listo por hoy</div>
            <div className="text-[16px] text-ink-2 mt-1">Hiciste todo lo de la pauta. Mañana se vuelve a empezar.</div>
          </div>
        )}
      </Hero>

      <SectionTitle title="Hoy" hint="Toca un ejercicio para ver cómo se hace." />
      <ul className="rise border-t border-line-soft">
        {items.map((item) => {
          const ex = SWALLOW_EXERCISES[item.exerciseId];
          const n = timesToday(item, today);
          const met = isMet(item, today);
          return (
            <li key={item.exerciseId} className="border-b border-line-soft">
              <button
                type="button"
                onClick={() => setPreview(item)}
                className="w-full flex items-center gap-3 px-1 py-3.5 text-left rounded-lg hover:bg-paper-2/60 active:bg-paper-2 transition-colors"
                aria-label={`Ver cómo se hace: ${ex.name}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[18px] font-semibold leading-tight">{ex.name}</div>
                  <div className="text-[15px] text-ink-2 mt-0.5 leading-snug">
                    {dosage(item)} · {perDayLabel(item)}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Progress item={item} n={n} size={14} />
                  <span className={`text-[15px] font-semibold whitespace-nowrap ${met ? 'text-work' : 'text-ink-2'}`}>
                    {met ? '✓ Listo' : `${n} de ${item.perDay}`}
                  </span>
                </div>
                <RowChevron />
              </button>
            </li>
          );
        })}
      </ul>

      <WeekLog />

      {preview && (
        <SwallowPreview
          item={preview}
          onClose={closePreview}
          onPractice={() => { closePreview(); onStart({ full: false, only: preview.exerciseId }); }}
        />
      )}
    </>
  );
}
