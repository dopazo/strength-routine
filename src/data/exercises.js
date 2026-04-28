// Cada ejercicio referencia poses por id y describe cómo se ancla la banda:
//   handToHand        — banda entre ambas manos
//   footToHand_dual   — un tramo por lado, del pie a la mano
//   overhead_to_feet  — manos sobre la cabeza, banda baja al centro de los pies
//   anchored_side     — anclada a un punto fijo (anchorPos)
export const EXERCISES = {
  pullApart: {
    name: 'Pull-apart',
    muscles: 'Hombros · Espalda alta',
    instructions: 'Sostén la banda al frente, brazos extendidos a la altura del pecho. Tira hacia los lados juntando los omóplatos.',
    keyframes: ['pullApartClosed', 'pullApartOpen', 'pullApartClosed'],
    duration: 2.5,
    band: { type: 'handToHand', naturalLength: 0.5 },
  },
  press: {
    name: 'Press de hombro',
    muscles: 'Hombros · Tríceps',
    instructions: 'Pisa el centro de la banda. Lleva las manos desde los hombros hasta extender los brazos arriba.',
    keyframes: ['pressDown', 'pressUp', 'pressDown'],
    duration: 2.5,
    band: { type: 'footToHand_dual', naturalLength: 0.6 },
  },
  tricep: {
    name: 'Extensión de tríceps',
    muscles: 'Tríceps',
    instructions: 'Sostén la banda con ambas manos sobre la cabeza. Baja flexionando solo los codos, brazos pegados a la cabeza.',
    keyframes: ['tricepUp', 'tricepDown', 'tricepUp'],
    duration: 2.5,
    band: { type: 'overhead_to_feet', naturalLength: 1.4 },
  },
  row: {
    name: 'Remo encorvado',
    muscles: 'Espalda · Bíceps',
    instructions: 'Pisa la banda. Inclínate adelante con espalda recta. Tira los codos atrás llevando las manos a la cintura.',
    keyframes: ['rowStart', 'rowPull', 'rowStart'],
    duration: 2.5,
    band: { type: 'footToHand_dual', naturalLength: 0.5 },
  },
  curl: {
    name: 'Curl de bíceps',
    muscles: 'Bíceps',
    instructions: 'Pisa el centro de la banda. Brazos pegados al cuerpo, palmas adelante. Flexiona los codos hasta los hombros.',
    keyframes: ['curlDown', 'curlUp', 'curlDown'],
    duration: 2.5,
    band: { type: 'footToHand_dual', naturalLength: 0.5 },
  },
  squat: {
    name: 'Sentadilla',
    muscles: 'Cuádriceps · Glúteos',
    instructions: 'Pisa la banda con ancho de hombros. Pasa las manos sobre los hombros sosteniendo la banda. Baja como sentándote.',
    keyframes: ['squatUp', 'squatDown', 'squatUp'],
    duration: 3.0,
    band: { type: 'footToHand_dual', naturalLength: 0.7 },
  },
  rdl: {
    name: 'Peso muerto rumano',
    muscles: 'Isquios · Glúteos · Espalda baja',
    instructions: 'Pisa la banda, sostén los extremos al frente de los muslos. Empuja la cadera atrás manteniendo espalda recta.',
    keyframes: ['rdlUp', 'rdlDown', 'rdlUp'],
    duration: 3.0,
    band: { type: 'footToHand_dual', naturalLength: 0.5 },
  },
  pallof: {
    name: 'Pallof press',
    muscles: 'Core · Oblicuos',
    instructions: 'Banda anclada al lado a la altura del pecho. Sostén con ambas manos al centro y extiéndelas al frente.',
    keyframes: ['pallofIn', 'pallofOut', 'pallofIn'],
    duration: 3.0,
    band: { type: 'anchored_side', anchorPos: [-2, 1.05, 0], naturalLength: 1.5 },
  },
  lateral: {
    name: 'Elevación lateral',
    muscles: 'Hombros (deltoides medio)',
    instructions: 'Pisa la banda, extremos en cada mano a los lados. Eleva los brazos rectos hasta la altura de los hombros.',
    keyframes: ['lateralDown', 'lateralUp', 'lateralDown'],
    duration: 2.5,
    band: { type: 'footToHand_dual', naturalLength: 0.5 },
  },
};
