import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EXERCISES } from '../data/exercises.js';
import { POSES } from '../data/poses.js';
import { blendPose } from '../utils.js';
import { applyPose, applyTint, buildSkeleton } from '../three/skeleton.js';
import { createBandRenderer } from '../three/bandRenderer.js';

export function ExerciseViewer({ exerciseId, paused }) {
  const containerRef = useRef(null);
  // stateRef expone los props mutables al loop de animación sin recrear la escena.
  const stateRef = useRef({ exerciseId, paused, clock: 0 });

  useEffect(() => {
    stateRef.current.exerciseId = exerciseId;
    stateRef.current.clock = 0;
  }, [exerciseId]);

  useEffect(() => {
    stateRef.current.paused = paused;
  }, [paused]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let width = container.clientWidth;
    let height = container.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(2.8, 1.4, 4);
    camera.lookAt(0, 0.95, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.7);
    keyLight.position.set(4, 8, 5);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x88aaff, 0.25);
    fillLight.position.set(-5, 3, -2);
    scene.add(fillLight);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 8),
      new THREE.MeshBasicMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.8 }),
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    const grid = new THREE.GridHelper(8, 16, 0x333333, 0x222222);
    grid.position.y = 0.001;
    scene.add(grid);

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xc4c4c4, roughness: 0.55, metalness: 0.1 });
    const joints = buildSkeleton(scene, bodyMat);
    const bands = createBandRenderer(scene);

    // Colores reusados cada frame para el tinte muscular durante la tensión.
    const baseColor = new THREE.Color(0xc4c4c4);
    const tintColor = new THREE.Color(0xd06060);

    // Órbita de cámara con drag (mouse/touch) + zoom con rueda.
    let camAngle = 0.45, camHeight = 1.5, camDist = 4;
    let dragging = false, lastX = 0, lastY = 0;
    const onDown = (e) => {
      dragging = true;
      const t = e.touches ? e.touches[0] : e;
      lastX = t.clientX; lastY = t.clientY;
    };
    const onUp = () => { dragging = false; };
    const onMove = (e) => {
      if (!dragging) return;
      const t = e.touches ? e.touches[0] : e;
      camAngle += (t.clientX - lastX) * 0.01;
      camHeight = Math.max(0.3, Math.min(2.8, camHeight - (t.clientY - lastY) * 0.008));
      lastX = t.clientX; lastY = t.clientY;
    };
    const onWheel = (e) => {
      e.preventDefault();
      camDist = Math.max(2.5, Math.min(7, camDist + e.deltaY * 0.005));
    };
    const canvas = renderer.domElement;
    canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', onMove);
    canvas.addEventListener('touchstart', onDown, { passive: true });
    window.addEventListener('touchend', onUp);
    window.addEventListener('touchmove', onMove, { passive: true });
    canvas.addEventListener('wheel', onWheel, { passive: false });

    const ro = new ResizeObserver(() => {
      width = container.clientWidth;
      height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
    ro.observe(container);

    let raf;
    let lastTime = performance.now();

    function animate() {
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      if (!stateRef.current.paused) stateRef.current.clock += dt;

      const exercise = EXERCISES[stateRef.current.exerciseId];
      if (exercise) {
        const t = (stateRef.current.clock % exercise.duration) / exercise.duration;
        const segCount = exercise.keyframes.length - 1;
        const segPos = t * segCount;
        const segIdx = Math.min(Math.floor(segPos), segCount - 1);
        const segT = segPos - segIdx;
        const eased = segT * segT * (3 - 2 * segT); // smoothstep
        const pose = blendPose(
          POSES[exercise.keyframes[segIdx]],
          POSES[exercise.keyframes[segIdx + 1]],
          eased,
        );
        applyPose(joints, pose);
        // Tensión 0→1→0 a lo largo del ciclo [A, B, A]: pico en pose B.
        const tension = segIdx === 0 ? eased : 1 - eased;
        applyTint(joints.meshes, exercise.works ?? [], tension, baseColor, tintColor);
        scene.updateMatrixWorld(true);
        bands.render(exercise, joints);
      }

      camera.position.set(
        Math.sin(camAngle) * camDist,
        camHeight,
        Math.cos(camAngle) * camDist,
      );
      camera.lookAt(0, 0.95, 0);

      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    }
    animate();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('touchstart', onDown);
      window.removeEventListener('touchend', onUp);
      window.removeEventListener('touchmove', onMove);
      canvas.removeEventListener('wheel', onWheel);
      bands.dispose();
      renderer.dispose();
      bodyMat.dispose();
      Object.values(joints.meshes).forEach((m) => m.material.dispose());
      if (canvas.parentNode === container) container.removeChild(canvas);
    };
  }, []);

  return <div ref={containerRef} className="w-full h-full" />;
}
