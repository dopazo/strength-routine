import { lazy } from 'react';

// Carga diferida de las láminas de deglución (geometría de cabeza y cuello):
// el inicio queda liviano y el visor se descarga en segundo plano cuando se
// abre la pestaña de deglución.
let headModule = null;

export function loadHeadViewer() {
  headModule ??= import('./HeadViewer.jsx');
  return headModule;
}

export const LazyHeadViewer = lazy(() => loadHeadViewer().then((m) => ({ default: m.HeadViewer })));

export function preloadHeadViewerWhenIdle() {
  const run = () => { loadHeadViewer(); };
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(run, { timeout: 2000 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(run, 800);
  return () => window.clearTimeout(id);
}
