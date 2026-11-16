'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { player, useGame } from '@/lib/store';
import { getNpc } from '@/lib/village';

const ARRIVE_DISTANCE = 4.5;

/** 말 걸 수 있는 주민 발밑의 고리 + 길 안내 표시 */
export function Markers() {
  const nearby = useGame((s) => getNpc(s.nearbyId));
  const guide = useGame((s) => getNpc(s.guideId));
  const ring = useRef<THREE.Mesh>(null);
  const arrow = useRef<THREE.Group>(null);
  const beam = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ring.current) ring.current.scale.setScalar(1 + Math.sin(t * 5) * 0.08);
    if (beam.current) (beam.current.material as THREE.MeshBasicMaterial).opacity = 0.22 + Math.sin(t * 3) * 0.08;
    if (!guide || !arrow.current) return;
    const dx = guide.x - player.x;
    const dz = guide.z - player.z;
    const distance = Math.hypot(dx, dz);
    if (distance < ARRIVE_DISTANCE) {
      useGame.setState({ guideId: null });
      return;
    }
    // 플레이어 앞 바닥에서 목적지를 가리킨다
    arrow.current.position.set(player.x + (dx / distance) * 2.2, 0.12 + Math.sin(t * 4) * 0.04, player.z + (dz / distance) * 2.2);
    arrow.current.rotation.y = Math.atan2(dx, dz);
  });

  return (
    <>
      {nearby && (
        <mesh ref={ring} position={[nearby.x, 0.08, nearby.z]} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.95, 1.2, 40]} />
          <meshBasicMaterial color="#1f5fff" transparent opacity={0.9} />
        </mesh>
      )}
      {guide && (
        <>
          <mesh ref={beam} position={[guide.x, 30, guide.z]}>
            <cylinderGeometry args={[0.9, 0.9, 60, 16, 1, true]} />
            <meshBasicMaterial color="#ffd83a" transparent opacity={0.25} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          <group ref={arrow}>
            <mesh rotation-x={Math.PI / 2}>
              <coneGeometry args={[0.55, 1.3, 3]} />
              <meshBasicMaterial color="#1f5fff" />
            </mesh>
          </group>
        </>
      )}
    </>
  );
}
