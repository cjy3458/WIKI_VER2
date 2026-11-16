'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { DIVE_SECONDS, cameraState, player } from '@/lib/store';

const lookAt = new THREE.Vector3();
const desired = new THREE.Vector3();

/** 플레이어를 따라가는 3인칭 카메라. 드래그로 회전, 휠/핀치로 줌 */
export function CameraRig() {
  const { camera, gl } = useThree();
  const sun = useRef<THREE.DirectionalLight>(null);

  useEffect(() => {
    const el = gl.domElement;
    const pointers = new Map<number, { x: number; y: number }>();
    let pinch = 0;

    const down = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      if (pointers.size === 1) {
        cameraState.yaw -= (e.clientX - prev.x) * 0.006;
        cameraState.pitch = THREE.MathUtils.clamp(cameraState.pitch + (e.clientY - prev.y) * 0.004, 0.22, 1.3);
      }
      prev.x = e.clientX;
      prev.y = e.clientY;
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch) zoom((pinch - distance) * 0.05);
        pinch = distance;
      }
    };
    const up = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      pinch = 0;
    };
    const zoom = (amount: number) => {
      cameraState.distance = THREE.MathUtils.clamp(cameraState.distance + amount, 7, 120);
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      zoom(e.deltaY * 0.012);
    };

    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('wheel', wheel);
    };
  }, [gl]);

  useFrame((_, delta) => {
    // 입장 연출: 섬 위 높은 곳에서 캐릭터 뒤로 내려온다 (끝으로 갈수록 느려진다)
    let dive = 0;
    if (cameraState.dive > 0) {
      cameraState.dive = Math.max(0, cameraState.dive - delta);
      dive = (cameraState.dive / DIVE_SECONDS) ** 3;
      cameraState.snap = true;
    }
    const yaw = cameraState.yaw;
    const pitch = cameraState.pitch + dive * 0.75;
    const distance = cameraState.distance + dive * 150;
    const flat = Math.cos(pitch) * distance;
    desired.set(player.x + Math.sin(yaw) * flat, 1.4 + Math.sin(pitch) * distance, player.z + Math.cos(yaw) * flat);
    if (cameraState.snap) {
      camera.position.copy(desired);
      cameraState.snap = false;
    } else {
      camera.position.lerp(desired, 1 - Math.exp(-10 * delta));
    }
    lookAt.set(player.x, 1.5, player.z);
    camera.lookAt(lookAt);

    // 그림자 범위가 플레이어를 따라다니게 한다
    const light = sun.current;
    if (light) {
      light.position.set(player.x + 28, 46, player.z + 18);
      light.target.position.set(player.x, 0, player.z);
      light.target.updateMatrixWorld();
    }
  });

  return (
    <directionalLight
      ref={sun}
      intensity={2.1}
      color="#fff4dd"
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-46}
      shadow-camera-right={46}
      shadow-camera-top={46}
      shadow-camera-bottom={-46}
      shadow-camera-near={1}
      shadow-camera-far={160}
      shadow-bias={-0.0006}
    />
  );
}
