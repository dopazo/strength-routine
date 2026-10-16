// Poses de la cabeza para las láminas de deglución. Cada pose es un dict
// plano de parámetros (los que falten valen 0), igual que las poses del
// muñeco 3D en src/data/poses.js. Las vistas (sideView.js / frontView.js)
// traducen estos parámetros a formas.
//
//   jaw          — apertura de la mandíbula en grados (0 = dientes juntos)
//   jawX         — desplazamiento lateral del mentón en mm (masticar)
//   tCup, tSqueeze, tBack, tPress, tOut — formas de la lengua (0..1):
//                  recoger el bolo, empujarlo contra el paladar, retraer la
//                  base, isométrico contra el paladar, lengua afuera (Masako)
//   velum        — elevación del velo del paladar (cierra la nariz)
//   hyo          — elevación de hioides y laringe (la "nuez" sube)
//   epi          — epiglotis plegada sobre la laringe
//   phx          — constricción de la pared posterior de la faringe
//   ues          — apertura del esfínter esofágico superior
//   bolus, bolusA — posición del bolo de saliva en su recorrido y visibilidad
//   tongueEffort, supraEffort, wallEffort — tinte de esfuerzo (lengua,
//                  músculos suprahioideos, constrictor faríngeo)
//   glow         — presión de la lengua contra el paladar
//   hand         — mano tocando el cuello · arrow — flecha "sube"
//   masL, masR   — maseteros activos · xray — molares y chicle visibles
//   gum          — lado del chicle (-1 izquierda … 1 derecha) · squint — ojos apretados
export const HEAD_POSES = {
  rest: {},

  // Deglución normal (Mendelsohn), con la mano en el cuello.
  mRest: { hand: 1 },
  mPrep: { hand: 1, tCup: 1, bolus: 0, bolusA: 1 },
  mOral: { hand: 1, tSqueeze: 1, velum: 0.75, hyo: 0.2, bolus: 0.3, bolusA: 1 },
  mPharynx: {
    hand: 1, tSqueeze: 0.35, tBack: 1, velum: 1, hyo: 1, epi: 1, phx: 1, ues: 1, bolus: 0.66, bolusA: 1, supraEffort: 0.6,
  },
  // Maniobra de Mendelsohn: laringe sostenida arriba.
  mHold: {
    hand: 1, tSqueeze: 0.7, tBack: 0.25, velum: 0.35, hyo: 1, epi: 0.9, phx: 0.15, ues: 0.7, bolus: 1, bolusA: 0,
    supraEffort: 1, arrow: 1, squint: 0.4,
  },

  // Isométrico lingual (boca abierta, como en la lámina).
  lOpen: { jaw: 14 },
  lPress: { jaw: 14, tPress: 1, glow: 1, tongueEffort: 0.7, squint: 0.6 },

  // Masako: lengua afuera entre los dientes y tragar así.
  kOut: { jaw: 6, tOut: 1 },
  kPrep: { jaw: 6, tOut: 1, bolus: 0.24, bolusA: 1 },
  kSwallow: {
    jaw: 5.4, tOut: 1, velum: 1, hyo: 0.85, epi: 1, phx: 1, ues: 1, bolus: 0.66, bolusA: 1, wallEffort: 1, squint: 0.5,
  },
  kAfter: { jaw: 5.6, tOut: 1, velum: 0.3, hyo: 0.3, epi: 0.3, phx: 0.35, ues: 0.3, bolus: 1, bolusA: 0, wallEffort: 0.4 },

  // Masticación (la anima chewMotion en motion.js; esta es su pose quieta).
  chewRest: { xray: 1, gum: 1 },
};

// Parámetros que se tiñen por esfuerzo: en las pausas sostenidas laten.
export const EFFORT_KEYS = ['tongueEffort', 'supraEffort', 'wallEffort', 'glow'];
