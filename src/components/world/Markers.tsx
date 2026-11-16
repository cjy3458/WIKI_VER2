'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type * as THREE from 'three';
import { useGame } from '@/lib/store';
import { getNpc } from '@/lib/village';

/** 말 걸 수 있는 주민 발밑의 고리 */
export function Markers() {
  const nearby = useGame((s) => getNpc(s.nearbyId));
  const ring = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    ring.current?.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 5) * 0.08);
  });

  if (!nearby) return null;
  return (
    <mesh ref={ring} position={[nearby.x, 0.08, nearby.z]} rotation-x={-Math.PI / 2}>
      <ringGeometry args={[0.95, 1.2, 40]} />
      <meshBasicMaterial color="#1f5fff" transparent opacity={0.9} />
    </mesh>
  );
}
