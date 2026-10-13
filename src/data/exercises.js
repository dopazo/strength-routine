// Cada ejercicio referencia poses por id y describe cómo se anima y cómo se
// ancla la banda.
//
//   keyframes  — poses de una repetición, normalmente [inicio, fin, inicio].
//   concentric — índice del tramo con esfuerzo (0 = inicio→fin, por defecto;
//                1 en la sentadilla, donde primero se baja).
//   tempo      — proporciones [mover 0, pausa, mover 1, pausa…] por tramo. Se
//                escalan para que las repeticiones de la rutina calcen con
//                `workSec`. Por defecto: concéntrica 1 · 0.35 · excéntrica 2 · 0.45.
//   cues       — texto guía de cada tramo (se muestra en el visor).
//   works      — mallas del muñeco que se tiñen al trabajar (ver skeleton.js).
//   camera     — encuadre: yaw (giro alrededor del muñeco), pitch, dist, target.
//   restPose   — pose durante el descanso (por defecto 'standing').
//   plantHands — las manos quedan fijas (IK) donde las pone el primer keyframe.
//   handPath   — las manos viajan en línea recta entre keyframes (IK), en vez
//                de seguir el arco que da interpolar los ángulos. `arc` suma
//                un desvío (máximo a mitad de camino) en esa dirección.
//   band       — anclaje de la banda:
//     handToHand         — banda entre ambas manos
//     footToHand_dual    — se pisa el centro, un tramo por lado hasta cada mano
//     overhead_to_feet   — de las manos (juntas) al centro de los pies
//     oneFoot_to_handMid — un pie pisa un extremo, ambas manos toman el otro
//     handToHand_overHip — cruza sobre la cadera, extremos en cada mano
//     anchored_side      — anclada a un punto fijo (requiere anchorPos)
//   El largo natural se calcula solo: en el keyframe donde la banda está más
//   corta queda estirada `minStretch` veces (o se fija con `naturalLength`).
export const EXERCISES = {
  pullApart: {
    name: 'Pull-apart',
    muscles: 'Hombros · Espalda alta',
    works: ['upperBack', 'shoulderCapL', 'shoulderCapR'],
    instructions: 'Sostén la banda al frente, brazos extendidos a la altura del pecho. Tira hacia los lados juntando los omóplatos.',
    keyframes: ['pullApartClosed', 'pullApartOpen', 'pullApartClosed'],
    tempo: [0.9, 0.4, 1.6, 0.3],
    cues: ['ABRE', 'VUELVE LENTO'],
    band: { type: 'handToHand', minStretch: 1.05 },
    camera: { yaw: 0.6, pitch: 0.1, dist: 3.7, target: [0, 1.08, 0.1] },
  },
  press: {
    name: 'Press de hombro',
    muscles: 'Hombros · Tríceps',
    works: ['shoulderCapL', 'shoulderCapR', 'tricepsL', 'tricepsR'],
    instructions: 'Pisa el centro de la banda. Lleva las manos desde los hombros hasta extender los brazos arriba.',
    keyframes: ['pressDown', 'pressUp', 'pressDown'],
    cues: ['EMPUJA', 'BAJA LENTO'],
    band: { type: 'footToHand_dual', minStretch: 1.08 },
    camera: { yaw: 0.42, pitch: 0.06, dist: 4.3, target: [0, 1.22, 0] },
  },
  tricep: {
    name: 'Tríceps kickback',
    muscles: 'Tríceps',
    works: ['tricepsL', 'tricepsR'],
    instructions: 'Pisa la banda. Inclínate adelante con rodillas algo flexionadas, codos pegados al cuerpo. Estira los codos llevando las manos atrás.',
    keyframes: ['tricepKickbackStart', 'tricepKickbackEnd', 'tricepKickbackStart'],
    cues: ['EXTIENDE', 'VUELVE LENTO'],
    band: { type: 'footToHand_dual', minStretch: 1.04 },
    camera: { yaw: 1.2, pitch: 0.12, dist: 3.45, target: [0, 0.86, 0] },
  },
  row: {
    name: 'Remo encorvado',
    muscles: 'Espalda · Bíceps',
    works: ['upperBack', 'bicepsL', 'bicepsR'],
    instructions: 'Pisa la banda. Inclínate adelante con espalda recta. Tira los codos atrás llevando las manos a la cintura.',
    keyframes: ['rowStart', 'rowPull', 'rowStart'],
    cues: ['TIRA', 'BAJA LENTO'],
    band: { type: 'footToHand_dual', minStretch: 1.05 },
    camera: { yaw: 1.15, pitch: 0.12, dist: 3.45, target: [0, 0.84, 0.05] },
  },
  curl: {
    name: 'Curl de bíceps',
    muscles: 'Bíceps',
    works: ['bicepsL', 'bicepsR', 'forearmL', 'forearmR'],
    instructions: 'Pisa el centro de la banda. Brazos pegados al cuerpo, palmas adelante. Flexiona los codos hasta los hombros.',
    keyframes: ['curlDown', 'curlUp', 'curlDown'],
    cues: ['SUBE', 'BAJA LENTO'],
    band: { type: 'footToHand_dual', minStretch: 1.05 },
    camera: { yaw: 0.85, pitch: 0.1, dist: 3.5, target: [0, 1.0, 0.05] },
  },
  squat: {
    name: 'Sentadilla',
    muscles: 'Cuádriceps · Glúteos',
    works: ['quadsL', 'quadsR', 'glutes'],
    instructions: 'Pisa la banda con ancho de hombros. Pasa las manos sobre los hombros sosteniendo la banda. Baja como sentándote.',
    keyframes: ['squatUp', 'squatDown', 'squatUp'],
    concentric: 1,
    tempo: [2, 0.3, 1, 0.5],
    cues: ['BAJA LENTO', 'SUBE'],
    band: { type: 'footToHand_dual', minStretch: 1.06 },
    camera: { yaw: 1.0, pitch: 0.12, dist: 3.55, target: [0, 0.9, 0] },
  },
  hipThrust: {
    name: 'Hip thrust',
    muscles: 'Glúteos · Isquios',
    works: ['glutes', 'hamstringsL', 'hamstringsR'],
    instructions: 'Boca arriba y rodillas dobladas. Cruza la banda sobre de la cadera y sujeta los extremos contra el suelo. Sube la cadera apretando glúteos hasta alinear hombros, cadera y rodillas; baja con control.',
    keyframes: ['hipThrustDown', 'hipThrustUp', 'hipThrustDown'],
    tempo: [1, 0.6, 2, 0.4],
    cues: ['SUBE', 'BAJA LENTO'],
    restPose: 'hipThrustDown',
    plantHands: true,
    band: { type: 'handToHand_overHip', minStretch: 1.02 },
    camera: { yaw: 1.45, pitch: 0.24, dist: 3.0, target: [0, 0.3, -0.5] },
  },
  woodchopperL: {
    name: 'Woodchopper diagonal (izq.)',
    muscles: 'Core · Oblicuos',
    works: ['abs', 'lowerBack'],
    instructions: 'Pisa un extremo de la banda con el pie izquierdo. Toma el otro extremo con ambas manos a la altura de la cadera izquierda y súbelo en diagonal hasta arriba del hombro derecho.',
    keyframes: ['woodchopL_Low', 'woodchopL_High', 'woodchopL_Low'],
    tempo: [1.1, 0.35, 1.8, 0.4],
    cues: ['SUBE EN DIAGONAL', 'BAJA LENTO'],
    handPath: { arc: [0, 0.02, 0.3] },
    band: { type: 'oneFoot_to_handMid', foot: 'L', minStretch: 1.03 },
    camera: { yaw: 0.55, pitch: 0.12, dist: 3.85, target: [0, 1.1, 0.1] },
  },
  woodchopperR: {
    name: 'Woodchopper diagonal (der.)',
    muscles: 'Core · Oblicuos',
    works: ['abs', 'lowerBack'],
    instructions: 'Pisa un extremo de la banda con el pie derecho. Toma el otro extremo con ambas manos a la altura de la cadera derecha y súbelo en diagonal hasta arriba del hombro izquierdo.',
    keyframes: ['woodchopR_Low', 'woodchopR_High', 'woodchopR_Low'],
    tempo: [1.1, 0.35, 1.8, 0.4],
    cues: ['SUBE EN DIAGONAL', 'BAJA LENTO'],
    handPath: { arc: [0, 0.02, 0.3] },
    band: { type: 'oneFoot_to_handMid', foot: 'R', minStretch: 1.03 },
    camera: { yaw: -0.55, pitch: 0.12, dist: 3.85, target: [0, 1.1, 0.1] },
  },
  lateral: {
    name: 'Elevación lateral',
    muscles: 'Hombros (deltoides medio)',
    works: ['shoulderCapL', 'shoulderCapR'],
    instructions: 'Pisa la banda, extremos en cada mano a los lados. Eleva los brazos rectos hasta la altura de los hombros.',
    keyframes: ['lateralDown', 'lateralUp', 'lateralDown'],
    cues: ['SUBE', 'BAJA LENTO'],
    band: { type: 'footToHand_dual', minStretch: 1.04 },
    camera: { yaw: 0.2, pitch: 0.08, dist: 3.75, target: [0, 1.08, 0] },
  },
};
