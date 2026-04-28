import { d } from '../utils.js';

// Ángulos de cada articulación para cada postura clave.
// Cada pose define posición/rotación de root + torso y rotaciones de
// hombros, codos, caderas y rodillas (L = izquierda, R = derecha).
export const POSES = {
  standing: {
    rootPos: [0, 1.0, 0], rootRot: [0, 0, 0], torsoRot: [0, 0, 0],
    shoulderL: [d(10), 0, d(8)], shoulderR: [d(10), 0, d(-8)],
    elbowL: [d(-15), 0, 0], elbowR: [d(-15), 0, 0],
    hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: [d(5), 0, 0], kneeR: [d(5), 0, 0],
  },
  pullApartClosed: {
    rootPos: [0, 1.0, 0], rootRot: [0, 0, 0], torsoRot: [0, 0, 0],
    shoulderL: [d(-90), 0, d(70)], shoulderR: [d(-90), 0, d(-70)],
    elbowL: [d(-15), 0, 0], elbowR: [d(-15), 0, 0],
    hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: [d(5), 0, 0], kneeR: [d(5), 0, 0],
  },
  pullApartOpen: {
    rootPos: [0, 1.0, 0], rootRot: [0, 0, 0], torsoRot: [0, 0, 0],
    shoulderL: [d(-90), 0, d(0)], shoulderR: [d(-90), 0, d(0)],
    elbowL: [d(-15), 0, 0], elbowR: [d(-15), 0, 0],
    hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: [d(5), 0, 0], kneeR: [d(5), 0, 0],
  },
  pressDown: {
    rootPos: [0, 1.0, 0], rootRot: [0, 0, 0], torsoRot: [0, 0, 0],
    shoulderL: [d(-30), 0, d(80)], shoulderR: [d(-30), 0, d(-80)],
    elbowL: [d(-100), 0, 0], elbowR: [d(-100), 0, 0],
    hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: [d(5), 0, 0], kneeR: [d(5), 0, 0],
  },
  pressUp: {
    rootPos: [0, 1.0, 0], rootRot: [0, 0, 0], torsoRot: [0, 0, 0],
    shoulderL: [d(-170), 0, d(10)], shoulderR: [d(-170), 0, d(-10)],
    elbowL: [d(-5), 0, 0], elbowR: [d(-5), 0, 0],
    hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: [d(5), 0, 0], kneeR: [d(5), 0, 0],
  },
  curlDown: {
    rootPos: [0, 1.0, 0], rootRot: [0, 0, 0], torsoRot: [0, 0, 0],
    shoulderL: [d(0), 0, d(15)], shoulderR: [d(0), 0, d(-15)],
    elbowL: [d(-10), 0, 0], elbowR: [d(-10), 0, 0],
    hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: [d(5), 0, 0], kneeR: [d(5), 0, 0],
  },
  curlUp: {
    rootPos: [0, 1.0, 0], rootRot: [0, 0, 0], torsoRot: [0, 0, 0],
    shoulderL: [d(0), 0, d(15)], shoulderR: [d(0), 0, d(-15)],
    elbowL: [d(-130), 0, 0], elbowR: [d(-130), 0, 0],
    hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: [d(5), 0, 0], kneeR: [d(5), 0, 0],
  },
  squatUp: {
    rootPos: [0, 1.0, 0], rootRot: [0, 0, 0], torsoRot: [0, 0, 0],
    shoulderL: [d(80), 0, d(10)], shoulderR: [d(80), 0, d(-10)],
    elbowL: [d(-40), 0, 0], elbowR: [d(-40), 0, 0],
    hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: [d(5), 0, 0], kneeR: [d(5), 0, 0],
  },
  squatDown: {
    rootPos: [0, 0.55, 0], rootRot: [0, 0, 0], torsoRot: [d(20), 0, 0],
    shoulderL: [d(80), 0, d(10)], shoulderR: [d(80), 0, d(-10)],
    elbowL: [d(-40), 0, 0], elbowR: [d(-40), 0, 0],
    hipL: [d(-90), 0, 0], hipR: [d(-90), 0, 0],
    kneeL: [d(110), 0, 0], kneeR: [d(110), 0, 0],
  },
  rdlUp: {
    rootPos: [0, 1.0, 0], rootRot: [0, 0, 0], torsoRot: [0, 0, 0],
    shoulderL: [d(0), 0, d(10)], shoulderR: [d(0), 0, d(-10)],
    elbowL: [d(-10), 0, 0], elbowR: [d(-10), 0, 0],
    hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: [d(10), 0, 0], kneeR: [d(10), 0, 0],
  },
  rdlDown: {
    rootPos: [0, 0.85, 0], rootRot: [0, 0, 0], torsoRot: [d(75), 0, 0],
    shoulderL: [d(-75), 0, d(10)], shoulderR: [d(-75), 0, d(-10)],
    elbowL: [d(-5), 0, 0], elbowR: [d(-5), 0, 0],
    hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: [d(15), 0, 0], kneeR: [d(15), 0, 0],
  },
  rowStart: {
    rootPos: [0, 0.85, 0], rootRot: [0, 0, 0], torsoRot: [d(75), 0, 0],
    shoulderL: [d(-75), 0, d(10)], shoulderR: [d(-75), 0, d(-10)],
    elbowL: [d(-15), 0, 0], elbowR: [d(-15), 0, 0],
    hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: [d(15), 0, 0], kneeR: [d(15), 0, 0],
  },
  rowPull: {
    rootPos: [0, 0.85, 0], rootRot: [0, 0, 0], torsoRot: [d(75), 0, 0],
    shoulderL: [d(-50), 0, d(15)], shoulderR: [d(-50), 0, d(-15)],
    elbowL: [d(-110), 0, 0], elbowR: [d(-110), 0, 0],
    hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: [d(15), 0, 0], kneeR: [d(15), 0, 0],
  },
  tricepUp: {
    rootPos: [0, 1.0, 0], rootRot: [0, 0, 0], torsoRot: [0, 0, 0],
    shoulderL: [d(-180), 0, d(15)], shoulderR: [d(-180), 0, d(-15)],
    elbowL: [d(-5), 0, 0], elbowR: [d(-5), 0, 0],
    hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: [d(5), 0, 0], kneeR: [d(5), 0, 0],
  },
  tricepDown: {
    rootPos: [0, 1.0, 0], rootRot: [0, 0, 0], torsoRot: [0, 0, 0],
    shoulderL: [d(-180), 0, d(15)], shoulderR: [d(-180), 0, d(-15)],
    elbowL: [d(-130), 0, 0], elbowR: [d(-130), 0, 0],
    hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: [d(5), 0, 0], kneeR: [d(5), 0, 0],
  },
  pallofIn: {
    rootPos: [0, 1.0, 0], rootRot: [0, d(15), 0], torsoRot: [0, 0, 0],
    shoulderL: [d(-80), 0, d(60)], shoulderR: [d(-80), 0, d(-60)],
    elbowL: [d(-100), 0, 0], elbowR: [d(-100), 0, 0],
    hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: [d(5), 0, 0], kneeR: [d(5), 0, 0],
  },
  pallofOut: {
    rootPos: [0, 1.0, 0], rootRot: [0, d(15), 0], torsoRot: [0, 0, 0],
    shoulderL: [d(-90), 0, d(20)], shoulderR: [d(-90), 0, d(-20)],
    elbowL: [d(-15), 0, 0], elbowR: [d(-15), 0, 0],
    hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: [d(5), 0, 0], kneeR: [d(5), 0, 0],
  },
  lateralDown: {
    rootPos: [0, 1.0, 0], rootRot: [0, 0, 0], torsoRot: [0, 0, 0],
    shoulderL: [d(0), 0, d(15)], shoulderR: [d(0), 0, d(-15)],
    elbowL: [d(-10), 0, 0], elbowR: [d(-10), 0, 0],
    hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: [d(5), 0, 0], kneeR: [d(5), 0, 0],
  },
  lateralUp: {
    rootPos: [0, 1.0, 0], rootRot: [0, 0, 0], torsoRot: [0, 0, 0],
    shoulderL: [d(0), 0, d(95)], shoulderR: [d(0), 0, d(-95)],
    elbowL: [d(-10), 0, 0], elbowR: [d(-10), 0, 0],
    hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: [d(5), 0, 0], kneeR: [d(5), 0, 0],
  },
};
