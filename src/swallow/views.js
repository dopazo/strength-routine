import { SIDE_LAYERS, SIDE_VIEWBOX, computeSide, sideAnchors } from './sideView.js';
import { FRONT_CLIPS, FRONT_LAYERS, FRONT_VIEWBOX, computeFront, frontAnchors } from './frontView.js';

// Vistas disponibles del visor de deglución. Cada una define su encuadre
// (viewBox en mm), las capas en orden de dibujo y cómo calcularlas a partir de
// los parámetros de la pose.
export const VIEWS = {
  side: {
    label: 'Por dentro',
    viewBox: SIDE_VIEWBOX,
    layers: SIDE_LAYERS,
    compute: computeSide,
    anchors: sideAnchors,
  },
  front: {
    label: 'De frente',
    viewBox: FRONT_VIEWBOX,
    layers: FRONT_LAYERS,
    clips: FRONT_CLIPS,
    compute: computeFront,
    anchors: frontAnchors,
  },
};

// Rótulos de estructuras: `dx`/`dy` desplazan el texto desde el punto de
// anclaje (mm); `align` = 'start' | 'end' | 'middle'.
export const LABELS = {
  side: {
    larynx: { text: 'Laringe', dx: 20, dy: 12, align: 'start' },
    tongue: { text: 'Lengua', dx: 0, dy: 0, align: 'middle', inside: true },
    epiglottis: { text: 'Epiglotis', dx: -16, dy: 14, align: 'end' },
    palate: { text: 'Paladar', dx: 2, dy: -12, align: 'middle' },
    wall: { text: 'Faringe', dx: -14, dy: -14, align: 'end' },
  },
  front: {
    larynx: { text: 'Nuez', dx: -28, dy: 4, align: 'end' },
    tongue: { text: 'Lengua', dx: 34, dy: 22, align: 'start' },
  },
};
