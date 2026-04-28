import { d } from '../utils.js';

// Ángulos de cada articulación para cada postura clave.
// Cada pose define posición/rotación de root + torso y rotaciones de
// hombros, codos, caderas y rodillas (L = izquierda, R = derecha).
//
// Convención del esqueleto: el brazo cuelga en local -Y desde el hombro,
// y Three.js aplica Euler XYZ intrínseco (Rz primero). Por eso, para abducir
// el brazo *hacia afuera*, shoulderL.z debe ser NEGATIVO y shoulderR.z POSITIVO.
export const POSES = {
  standing: {
    rootPos: [0, 1.0, 0], rootRot: [0, 0, 0], torsoRot: [0, 0, 0],
    shoulderL: [d(10), 0, d(-8)], shoulderR: [d(10), 0, d(8)],
    elbowL: [d(-15), 0, 0], elbowR: [d(-15), 0, 0],
    hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: [d(5), 0, 0], kneeR: [d(5), 0, 0],
  },
  pullApartClosed: {
    rootPos: [0, 1.0, 0], rootRot: [0, 0, 0], torsoRot: [0, 0, 0],
    shoulderL: [d(-90), 0, d(15)], shoulderR: [d(-90), 0, d(-15)],
    elbowL: [d(-10), 0, 0], elbowR: [d(-10), 0, 0],
    hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: [d(5), 0, 0], kneeR: [d(5), 0, 0],
  },
  pullApartOpen: {
    rootPos: [0, 1.0, 0], rootRot: [0, 0, 0], torsoRot: [0, 0, 0],
    shoulderL: [0, 0, d(-90)], shoulderR: [0, 0, d(90)],
    elbowL: [d(-10), 0, 0], elbowR: [d(-10), 0, 0],
    hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: [d(5), 0, 0], kneeR: [d(5), 0, 0],
  },
  pressDown: {
    rootPos: [0, 1.0, 0], rootRot: [0, 0, 0], torsoRot: [0, 0, 0],
    shoulderL: [d(-30), 0, d(-65)], shoulderR: [d(-30), 0, d(65)],
    elbowL: [d(-100), 0, 0], elbowR: [d(-100), 0, 0],
    hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: [d(5), 0, 0], kneeR: [d(5), 0, 0],
  },
  pressUp: {
    rootPos: [0, 1.0, 0], rootRot: [0, 0, 0], torsoRot: [0, 0, 0],
    shoulderL: [d(-170), 0, d(-10)], shoulderR: [d(-170), 0, d(10)],
    elbowL: [d(-5), 0, 0], elbowR: [d(-5), 0, 0],
    hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: [d(5), 0, 0], kneeR: [d(5), 0, 0],
  },
  curlDown: {
    rootPos: [0, 1.0, 0], rootRot: [0, 0, 0], torsoRot: [0, 0, 0],
    shoulderL: [d(0), 0, d(-15)], shoulderR: [d(0), 0, d(15)],
    elbowL: [d(-10), 0, 0], elbowR: [d(-10), 0, 0],
    hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: [d(5), 0, 0], kneeR: [d(5), 0, 0],
  },
  curlUp: {
    rootPos: [0, 1.0, 0], rootRot: [0, 0, 0], torsoRot: [0, 0, 0],
    shoulderL: [d(0), 0, d(-15)], shoulderR: [d(0), 0, d(15)],
    elbowL: [d(-130), 0, 0], elbowR: [d(-130), 0, 0],
    hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: [d(5), 0, 0], kneeR: [d(5), 0, 0],
  },
  squatUp: {
    rootPos: [0, 1.0, 0], rootRot: [0, 0, 0], torsoRot: [0, 0, 0],
    shoulderL: [d(-15), 0, d(-15)], shoulderR: [d(-15), 0, d(15)],
    elbowL: [d(-150), 0, 0], elbowR: [d(-150), 0, 0],
    hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: [d(5), 0, 0], kneeR: [d(5), 0, 0],
  },
  squatDown: {
    // rootPos.y/z están calculados para que con hipRot=-90° y kneeRot=110° los
    // pies queden plantados en el mismo (y≈0, z≈0) que en squatUp en vez de
    // flotar y desplazarse hacia adelante. La cadera baja y retrocede (como
    // una sentadilla real "sentándose atrás") mientras las rodillas avanzan.
    rootPos: [0, 0.475, -0.385], rootRot: [0, 0, 0], torsoRot: [d(25), 0, 0],
    shoulderL: [d(-15), 0, d(-15)], shoulderR: [d(-15), 0, d(15)],
    elbowL: [d(-150), 0, 0], elbowR: [d(-150), 0, 0],
    hipL: [d(-90), 0, 0], hipR: [d(-90), 0, 0],
    kneeL: [d(110), 0, 0], kneeR: [d(110), 0, 0],
  },
  rdlUp: {
    rootPos: [0, 1.0, 0], rootRot: [0, 0, 0], torsoRot: [0, 0, 0],
    shoulderL: [d(0), 0, d(-10)], shoulderR: [d(0), 0, d(10)],
    elbowL: [d(-10), 0, 0], elbowR: [d(-10), 0, 0],
    hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: [d(10), 0, 0], kneeR: [d(10), 0, 0],
  },
  rdlDown: {
    rootPos: [0, 0.95, 0], rootRot: [0, 0, 0], torsoRot: [d(55), 0, 0],
    shoulderL: [d(-55), 0, d(-8)], shoulderR: [d(-55), 0, d(8)],
    elbowL: [d(-5), 0, 0], elbowR: [d(-5), 0, 0],
    hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: [d(15), 0, 0], kneeR: [d(15), 0, 0],
  },
  rowStart: {
    rootPos: [0, 0.92, 0], rootRot: [0, 0, 0], torsoRot: [d(50), 0, 0],
    shoulderL: [d(-50), 0, d(-10)], shoulderR: [d(-50), 0, d(10)],
    elbowL: [d(-15), 0, 0], elbowR: [d(-15), 0, 0],
    hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: [d(15), 0, 0], kneeR: [d(15), 0, 0],
  },
  rowPull: {
    // Remo: hombros se EXTIENDEN (shoulder.x positivo) para llevar el codo
    // detrás del cuerpo, mientras el codo se flexiona para acercar la mano
    // a la cintura. Antes shoulder.x era -25° y solo flexionaba el codo,
    // por eso parecía curl en vez de remo.
    rootPos: [0, 0.92, 0], rootRot: [0, 0, 0], torsoRot: [d(50), 0, 0],
    shoulderL: [d(45), 0, d(-15)], shoulderR: [d(45), 0, d(15)],
    elbowL: [d(-110), 0, 0], elbowR: [d(-110), 0, 0],
    hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: [d(15), 0, 0], kneeR: [d(15), 0, 0],
  },
  // Tríceps kickback: inclinado adelante, codos pegados al cuerpo, pisa la banda.
  // Descanso = codos doblados 90°, brazos al frente.
  // Trabajo  = codos extendidos, antebrazos atrás.
  tricepKickbackStart: {
    rootPos: [0, 0.95, 0], rootRot: [0, 0, 0], torsoRot: [d(45), 0, 0],
    shoulderL: [d(45), 0, d(-10)], shoulderR: [d(45), 0, d(10)],
    elbowL: [d(-95), 0, 0], elbowR: [d(-95), 0, 0],
    hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: [d(20), 0, 0], kneeR: [d(20), 0, 0],
  },
  tricepKickbackEnd: {
    rootPos: [0, 0.95, 0], rootRot: [0, 0, 0], torsoRot: [d(45), 0, 0],
    shoulderL: [d(45), 0, d(-10)], shoulderR: [d(45), 0, d(10)],
    elbowL: [d(-5), 0, 0], elbowR: [d(-5), 0, 0],
    hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: [d(20), 0, 0], kneeR: [d(20), 0, 0],
  },
  // Woodchopper diagonal: pie pisa la banda y las manos van juntas al frente
  // del torso (shoulders fijos forward + ligero z inverso para que las manos
  // se acerquen al centro). El movimiento viene de la rotación + lean del torso.
  // L y R son espejo: pie izquierdo pisa → twist hacia izq abajo → arriba der.
  woodchopL_Low: {
    rootPos: [0, 1.0, 0], rootRot: [0, 0, 0], torsoRot: [d(35), d(25), d(20)],
    shoulderL: [d(-90), 0, d(20)], shoulderR: [d(-90), 0, d(-20)],
    elbowL: [d(-15), 0, 0], elbowR: [d(-15), 0, 0],
    hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: [d(15), 0, 0], kneeR: [d(15), 0, 0],
  },
  woodchopL_High: {
    rootPos: [0, 1.0, 0], rootRot: [0, 0, 0], torsoRot: [d(-10), d(-30), d(-15)],
    shoulderL: [d(-90), 0, d(20)], shoulderR: [d(-90), 0, d(-20)],
    elbowL: [d(-15), 0, 0], elbowR: [d(-15), 0, 0],
    hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: [d(15), 0, 0], kneeR: [d(15), 0, 0],
  },
  woodchopR_Low: {
    rootPos: [0, 1.0, 0], rootRot: [0, 0, 0], torsoRot: [d(35), d(-25), d(-20)],
    shoulderL: [d(-90), 0, d(20)], shoulderR: [d(-90), 0, d(-20)],
    elbowL: [d(-15), 0, 0], elbowR: [d(-15), 0, 0],
    hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: [d(15), 0, 0], kneeR: [d(15), 0, 0],
  },
  woodchopR_High: {
    rootPos: [0, 1.0, 0], rootRot: [0, 0, 0], torsoRot: [d(-10), d(30), d(15)],
    shoulderL: [d(-90), 0, d(20)], shoulderR: [d(-90), 0, d(-20)],
    elbowL: [d(-15), 0, 0], elbowR: [d(-15), 0, 0],
    hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: [d(15), 0, 0], kneeR: [d(15), 0, 0],
  },
  lateralDown: {
    rootPos: [0, 1.0, 0], rootRot: [0, 0, 0], torsoRot: [0, 0, 0],
    shoulderL: [d(0), 0, d(-15)], shoulderR: [d(0), 0, d(15)],
    elbowL: [d(-10), 0, 0], elbowR: [d(-10), 0, 0],
    hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: [d(5), 0, 0], kneeR: [d(5), 0, 0],
  },
  lateralUp: {
    rootPos: [0, 1.0, 0], rootRot: [0, 0, 0], torsoRot: [0, 0, 0],
    shoulderL: [d(0), 0, d(-92)], shoulderR: [d(0), 0, d(92)],
    elbowL: [d(-10), 0, 0], elbowR: [d(-10), 0, 0],
    hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: [d(5), 0, 0], kneeR: [d(5), 0, 0],
  },
};
