import { d } from '../utils.js';

// Ángulos de cada articulación para cada postura clave (Euler XYZ, radianes).
//
// Convenciones del esqueleto (src/three/skeleton.js):
// - El muñeco mira a +Z. "L" queda en x<0 (a la izquierda de la pantalla visto
//   de frente, como un espejo).
// - rootPos es la posición mundial de la pelvis (centro de las caderas);
//   de pie con las piernas estiradas vale [0, 1.0, 0].
// - torsoRot se reparte entre la bisagra de cadera (lumbar) y la columna alta
//   (torácica). Opcionalmente, lumbarRot + thoracicRot fijan cada tramo.
// - headRot es opcional; si falta, la cabeza compensa parte de la inclinación.
// - Brazos y piernas cuelgan en -Y local. Para abducir el brazo hacia afuera,
//   shoulderL.z es NEGATIVO y shoulderR.z POSITIVO. Codo: x negativo flexiona;
//   rodilla: x positivo flexiona; cadera: x negativo lleva el muslo adelante.
// - Durante el ejercicio los pies quedan fijos donde los pone el primer
//   keyframe (IK), así que en las demás poses las piernas solo orientan las
//   rodillas. Igual conviene que cada pose deje los tobillos en y ≈ 0.07.
//
// Estas poses se ajustaron resolviendo los ángulos a partir de posiciones
// objetivo de manos y pies; el Pose Lab (`?lab` en `bun run dev`) permite
// retocarlas y copiar el resultado.
export const POSES = {
  // Parado relajado: pose de descanso de los ejercicios de pie.
  standing: {
    rootPos: [0, 0.997, 0.01], rootRot: [0, 0, 0], torsoRot: [d(2), 0, 0],
    shoulderL: [d(-3), 0, d(-7.5)], shoulderR: [d(-3), 0, d(7.5)],
    elbowL: [d(-14), 0, 0], elbowR: [d(-14), 0, 0],
    hipL: [d(-3), d(-4.5), d(-3.5)], hipR: [d(-3), d(4.5), d(3.5)],
    kneeL: [d(6.5), 0, 0], kneeR: [d(6.5), 0, 0],
  },
  // Pull-apart: brazos al frente a la altura del pecho, manos algo más
  // abiertas que los hombros y la banda apenas tensa.
  pullApartClosed: {
    rootPos: [0, 0.997, 0], rootRot: [0, 0, 0], torsoRot: [0, 0, 0],
    shoulderL: [d(-46.5), d(23), d(-21.5)], shoulderR: [d(-46.5), d(-23), d(21.5)],
    elbowL: [d(-55), 0, 0], elbowR: [d(-55), 0, 0],
    hipL: [d(-3.5), d(-4.5), d(-3.5)], hipR: [d(-3.5), d(4.5), d(3.5)],
    kneeL: [d(7), 0, 0], kneeR: [d(7), 0, 0],
  },
  // Brazos abiertos en cruz con la banda contra el pecho, pecho arriba.
  pullApartOpen: {
    rootPos: [0, 0.997, 0], rootRot: [0, 0, 0], torsoRot: [d(-5), 0, 0],
    shoulderL: [d(-26), 0, d(-76)], shoulderR: [d(-26), 0, d(76)],
    elbowL: [d(-24), 0, 0], elbowR: [d(-24), 0, 0],
    hipL: [d(-3.5), d(-4.5), d(-3.5)], hipR: [d(-3.5), d(4.5), d(3.5)],
    kneeL: [d(7), 0, 0], kneeR: [d(7), 0, 0],
  },
  // Press: manos a la altura del mentón, codos abajo y algo adelante,
  // antebrazos casi verticales.
  pressDown: {
    rootPos: [0, 0.997, 0], rootRot: [0, 0, 0], torsoRot: [0, 0, 0],
    shoulderL: [d(-72), d(-31), d(-53)], shoulderR: [d(-72), d(31), d(53)],
    elbowL: [d(-127.5), 0, 0], elbowR: [d(-127.5), 0, 0],
    hipL: [d(-3.5), d(-4.5), d(-3.5)], hipR: [d(-3.5), d(4.5), d(3.5)],
    kneeL: [d(7), 0, 0], kneeR: [d(7), 0, 0],
  },
  // Brazos extendidos sobre la cabeza.
  pressUp: {
    rootPos: [0, 0.998, 0], rootRot: [0, 0, 0], torsoRot: [d(-2), 0, 0],
    shoulderL: [d(-82), d(71.5), d(-90)], shoulderR: [d(-82), d(-71.5), d(90)],
    elbowL: [d(-29.5), 0, 0], elbowR: [d(-29.5), 0, 0],
    hipL: [d(-2.5), d(-4.5), d(-3.5)], hipR: [d(-2.5), d(4.5), d(3.5)],
    kneeL: [d(4.5), 0, 0], kneeR: [d(4.5), 0, 0],
  },
  // Kickback: bisagra de cadera (~45°), brazos pegados al cuerpo apuntando
  // atrás y codos a 90° con los antebrazos colgando.
  tricepKickbackStart: {
    rootPos: [0, 0.93, -0.07], rootRot: [0, 0, 0], torsoRot: [d(46), 0, 0],
    shoulderL: [d(20), d(3), d(-6.5)], shoulderR: [d(20), d(-3), d(6.5)],
    elbowL: [d(-92), 0, 0], elbowR: [d(-92), 0, 0],
    hipL: [d(-26), d(-3), d(-4.5)], hipR: [d(-26), d(3), d(4.5)],
    kneeL: [d(43.5), 0, 0], kneeR: [d(43.5), 0, 0],
  },
  // Codos extendidos: los antebrazos quedan en línea con el brazo, hacia atrás.
  tricepKickbackEnd: {
    rootPos: [0, 0.93, -0.07], rootRot: [0, 0, 0], torsoRot: [d(46), 0, 0],
    shoulderL: [d(20), d(3), d(-6.5)], shoulderR: [d(20), d(-3), d(6.5)],
    elbowL: [d(-6), 0, 0], elbowR: [d(-6), 0, 0],
    hipL: [d(-26), d(-3), d(-4.5)], hipR: [d(-26), d(3), d(4.5)],
    kneeL: [d(43.5), 0, 0], kneeR: [d(43.5), 0, 0],
  },
  // Remo: bisagra de cadera (~48°), espalda recta, brazos colgando
  // verticales bajo los hombros.
  rowStart: {
    rootPos: [0, 0.92, -0.08], rootRot: [0, 0, 0], torsoRot: [d(48), 0, 0],
    shoulderL: [d(-49), 0, d(-3)], shoulderR: [d(-49), 0, d(3)],
    elbowL: [d(-10), 0, 0], elbowR: [d(-10), 0, 0],
    hipL: [d(-28), d(-2.5), d(-4.5)], hipR: [d(-28), d(2.5), d(4.5)],
    kneeL: [d(46.5), 0, 0], kneeR: [d(46.5), 0, 0],
  },
  // Los codos van hacia atrás pasando el torso y las manos llegan a la cintura.
  rowPull: {
    rootPos: [0, 0.92, -0.08], rootRot: [0, 0, 0], torsoRot: [d(46), 0, 0],
    shoulderL: [d(48.5), d(-5), d(-12.5)], shoulderR: [d(48.5), d(5), d(12.5)],
    elbowL: [d(-95), 0, 0], elbowR: [d(-95), 0, 0],
    hipL: [d(-28), d(-2.5), d(-4.5)], hipR: [d(-28), d(2.5), d(4.5)],
    kneeL: [d(46.5), 0, 0], kneeR: [d(46.5), 0, 0],
  },
  // Curl: brazos a los costados, palmas al frente, codos casi extendidos.
  curlDown: {
    rootPos: [0, 0.997, 0], rootRot: [0, 0, 0], torsoRot: [0, 0, 0],
    shoulderL: [d(-1), 0, d(-7)], shoulderR: [d(-1), 0, d(7)],
    elbowL: [d(-8), 0, 0], elbowR: [d(-8), 0, 0],
    hipL: [d(-3.5), d(-4.5), d(-3.5)], hipR: [d(-3.5), d(4.5), d(3.5)],
    kneeL: [d(7), 0, 0], kneeR: [d(7), 0, 0],
  },
  // Codos flexionados al máximo, avanzan apenas.
  curlUp: {
    rootPos: [0, 0.997, 0], rootRot: [0, 0, 0], torsoRot: [d(-2), 0, 0],
    shoulderL: [d(-7), d(1), d(-7)], shoulderR: [d(-7), d(-1), d(7)],
    elbowL: [d(-138), 0, 0], elbowR: [d(-138), 0, 0],
    hipL: [d(-3.5), d(-4.5), d(-3.5)], hipR: [d(-3.5), d(4.5), d(3.5)],
    kneeL: [d(7), 0, 0], kneeR: [d(7), 0, 0],
  },
  // Sentadilla: pies algo más abiertos que la cadera, manos sobre los
  // hombros sujetando la banda.
  squatUp: {
    rootPos: [0, 0.98, 0], rootRot: [0, 0, 0], torsoRot: [0, 0, 0],
    shoulderL: [d(-11.5), d(-20.5), d(-18.5)], shoulderR: [d(-11.5), d(20.5), d(18.5)],
    elbowL: [d(-158.5), 0, 0], elbowR: [d(-158.5), 0, 0],
    hipL: [d(-11.5), d(-15), d(-10)], hipR: [d(-11.5), d(15), d(10)],
    kneeL: [d(19.5), 0, 0], kneeR: [d(19.5), 0, 0],
  },
  // Cadera baja y atrás (muslos casi paralelos), torso inclinado y rodillas
  // sobre la punta de los pies.
  squatDown: {
    rootPos: [0, 0.56, -0.24], rootRot: [0, 0, 0], torsoRot: [d(40), 0, 0],
    shoulderL: [d(-11.5), d(-20.5), d(-18.5)], shoulderR: [d(-11.5), d(20.5), d(18.5)],
    elbowL: [d(-158.5), 0, 0], elbowR: [d(-158.5), 0, 0],
    hipL: [d(-78.5), d(-1), d(-19.5)], hipR: [d(-78.5), d(1), d(19.5)],
    kneeL: [d(106.5), 0, 0], kneeR: [d(106.5), 0, 0],
  },
  // Hip thrust en el suelo: boca arriba, rodillas dobladas y pies apoyados.
  // Las manos sujetan los extremos de la banda contra el suelo junto a la cadera.
  hipThrustDown: {
    rootPos: [0, 0.13, -0.42], rootRot: [d(-90), 0, 0], torsoRot: [0, 0, 0],
    headRot: [0, 0, 0],
    shoulderL: [d(97.5), d(58.5), d(-90)], shoulderR: [d(97.5), d(-58.5), d(90)],
    elbowL: [d(-40), 0, 0], elbowR: [d(-40), 0, 0],
    hipL: [d(-51), d(2), d(-7.5)], hipR: [d(-51), d(-2), d(7.5)],
    kneeL: [d(125.5), 0, 0], kneeR: [d(125.5), 0, 0],
  },
  // La cadera sube hasta alinear hombros, cadera y rodillas; la espalda
  // alta y la cabeza siguen apoyadas.
  hipThrustUp: {
    rootPos: [0, 0.43, -0.49], rootRot: [d(-90), 0, 0], torsoRot: [0, 0, 0],
    lumbarRot: [d(-34), 0, 0], thoracicRot: [d(8), 0, 0],
    headRot: [d(22), 0, 0],
    shoulderL: [d(125.5), d(58), d(-90)], shoulderR: [d(125.5), d(-58), d(90)],
    elbowL: [d(-40.5), 0, 0], elbowR: [d(-40.5), 0, 0],
    hipL: [d(-11), d(-2.5), d(-8.5)], hipR: [d(-11), d(2.5), d(8.5)],
    kneeL: [d(98), 0, 0], kneeR: [d(98), 0, 0],
  },
  // Woodchopper (pie izquierdo pisa la banda): torso girado y flexionado
  // hacia la izquierda, manos juntas junto a la rodilla izquierda.
  woodchopL_Low: {
    rootPos: [-0.03, 0.86, -0.05], rootRot: [0, 0, 0], torsoRot: [d(40), d(-36), d(10)],
    shoulderL: [d(-39.5), d(50.5), d(1.5)], shoulderR: [d(-34), d(-29), d(-2)],
    elbowL: [d(-35.5), 0, 0], elbowR: [d(-40.5), 0, 0],
    hipL: [d(-35.5), d(-9.5), d(-11)], hipR: [d(-35), d(7), d(14)],
    kneeL: [d(63), 0, 0], kneeR: [d(61), 0, 0],
  },
  // Torso girado a la derecha y erguido, brazos extendidos en diagonal
  // por sobre el hombro derecho.
  woodchopL_High: {
    rootPos: [0.02, 0.99, 0], rootRot: [0, 0, 0], torsoRot: [d(-6), d(34), d(-6)],
    shoulderL: [d(-86.5), d(-43.5), d(41.5)], shoulderR: [d(-96.5), d(-46.5), d(14)],
    elbowL: [d(-31.5), 0, 0], elbowR: [d(-53.5), 0, 0],
    hipL: [d(-6.5), d(-13), d(-8)], hipR: [d(-8), d(13.5), d(6)],
    kneeL: [d(10), 0, 0], kneeR: [d(14.5), 0, 0],
  },
  // Espejo del woodchopper izquierdo (pie derecho pisa la banda).
  woodchopR_Low: {
    rootPos: [0.03, 0.86, -0.05], rootRot: [0, 0, 0], torsoRot: [d(40), d(36), d(-10)],
    shoulderL: [d(-34), d(29), d(2)], shoulderR: [d(-39.5), d(-50.5), d(-1.5)],
    elbowL: [d(-40.5), 0, 0], elbowR: [d(-35.5), 0, 0],
    hipL: [d(-35), d(-7), d(-14)], hipR: [d(-35.5), d(9.5), d(11)],
    kneeL: [d(61), 0, 0], kneeR: [d(63), 0, 0],
  },
  woodchopR_High: {
    rootPos: [-0.02, 0.99, 0], rootRot: [0, 0, 0], torsoRot: [d(-6), d(-34), d(6)],
    shoulderL: [d(-96.5), d(46.5), d(-14)], shoulderR: [d(-86.5), d(43.5), d(-41.5)],
    elbowL: [d(-53.5), 0, 0], elbowR: [d(-31.5), 0, 0],
    hipL: [d(-8), d(-13.5), d(-6)], hipR: [d(-6.5), d(13), d(8)],
    kneeL: [d(14.5), 0, 0], kneeR: [d(10), 0, 0],
  },
  // Elevación lateral: brazos a los costados, codos apenas flexionados.
  lateralDown: {
    rootPos: [0, 0.997, 0], rootRot: [0, 0, 0], torsoRot: [0, 0, 0],
    shoulderL: [d(-3.5), d(0.5), d(-9)], shoulderR: [d(-3.5), d(-0.5), d(9)],
    elbowL: [d(-10), 0, 0], elbowR: [d(-10), 0, 0],
    hipL: [d(-3.5), d(-4.5), d(-3.5)], hipR: [d(-3.5), d(4.5), d(3.5)],
    kneeL: [d(7), 0, 0], kneeR: [d(7), 0, 0],
  },
  // Brazos a la altura de los hombros, levemente adelantados (plano escapular).
  lateralUp: {
    rootPos: [0, 0.997, 0], rootRot: [0, 0, 0], torsoRot: [0, 0, 0],
    shoulderL: [d(12), d(10.5), d(-94)], shoulderR: [d(12), d(-10.5), d(94)],
    elbowL: [d(-12), 0, 0], elbowR: [d(-12), 0, 0],
    hipL: [d(-3.5), d(-4.5), d(-3.5)], hipR: [d(-3.5), d(4.5), d(3.5)],
    kneeL: [d(7), 0, 0], kneeR: [d(7), 0, 0],
  },
  // Paso intermedio para bajar al suelo: cuclillas con brazos al frente.
  crouchLow: {
    rootPos: [0, 0.46, -0.22], rootRot: [0, 0, 0], torsoRot: [d(34), 0, 0],
    shoulderL: [d(-97.5), d(-1.5), d(-7.5)], shoulderR: [d(-97.5), d(1.5), d(7.5)],
    elbowL: [d(-20), 0, 0], elbowR: [d(-20), 0, 0],
    hipL: [d(-88.5), d(-3), d(-16.5)], hipR: [d(-88.5), d(3), d(16.5)],
    kneeL: [d(122), 0, 0], kneeR: [d(122), 0, 0],
  },
  // Sentado en el suelo tras los pies, apoyado en las manos.
  sitFloor: {
    rootPos: [0, 0.13, -0.42], rootRot: [0, 0, 0], torsoRot: [d(-22), 0, 0],
    shoulderL: [d(56.5), d(11.5), d(-12.5)], shoulderR: [d(56.5), d(-11.5), d(12.5)],
    elbowL: [d(-48), 0, 0], elbowR: [d(-48), 0, 0],
    hipL: [d(-141), d(2), d(-7)], hipR: [d(-141), d(-2), d(7)],
    kneeL: [d(125.5), 0, 0], kneeR: [d(125.5), 0, 0],
  },
};
