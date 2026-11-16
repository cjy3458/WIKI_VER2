'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type * as THREE from 'three';
import { isBlocked, player, useGame } from '@/lib/store';
import { getNpc, getSpot, village } from '@/lib/village';

const SPOT_RANGE = 3.4;

/** 말 걸 수 있는 주민, 쓸 수 있는 장치 발밑의 네모 고리 */
export function Markers() {
  const nearby = useGame((s) => getNpc(s.nearbyId));
  const spot = useGame((s) => getSpot(s.nearbySpot));
  const ring = useRef<THREE.Mesh>(null);
  const target = nearby ?? spot;

  useFrame((state) => {
    // 가까운 장치 찾기 (주민 찾기는 Npcs 가 한다)
    let found: (typeof village.spots)[number]['id'] | null = null;
    if (!isBlocked()) {
      for (const s of village.spots) {
        if (Math.hypot(player.x - s.x, player.z - s.z) < SPOT_RANGE) found = s.id;
      }
    }
    const game = useGame.getState();
    if (game.nearbySpot !== found) useGame.setState({ nearbySpot: found });

    if (ring.current) {
      ring.current.scale.setScalar(1 + (Math.floor(state.clock.elapsedTime * 4) % 2) * 0.12);
      ring.current.rotation.z = Math.PI / 4;
    }
  });

  if (!target) return null;
  return (
    <mesh ref={ring} position={[target.x, 0.12, target.z]} rotation-x={-Math.PI / 2}>
      <ringGeometry args={[1.15, 1.5, 4]} />
      <meshBasicMaterial color={nearby ? '#4c4df5' : '#ffd83a'} />
    </mesh>
  );
}
