// Carga diferida del visor 3D: Three.js es la mayor parte del JavaScript de la
// app y solo se usa en la pantalla de entrenamiento. Así la pantalla de inicio
// aparece rápido en el celular y el visor se descarga en segundo plano.
let viewerModule = null;

export function loadViewer() {
  viewerModule ??= import('./ExerciseViewer.jsx');
  return viewerModule;
}

// Precarga cuando el navegador está libre (o tras un momento si no hay
// requestIdleCallback, como en Safari).
export function preloadViewerWhenIdle() {
  const run = () => { loadViewer(); };
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(run, { timeout: 2000 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(run, 800);
  return () => window.clearTimeout(id);
}
