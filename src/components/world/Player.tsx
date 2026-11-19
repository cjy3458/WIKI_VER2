'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { dampAngle, markLion } from '@/components/world/geo';
import { ARM_OFFSET, LEG_OFFSET, LIMB_PIVOT, createPlayerGeometries } from '@/components/world/lionGeometry';
import { useNet } from '@/lib/net';
import { cameraState, controls, isBlocked, player } from '@/lib/store';
import { WALK_HALF, village } from '@/lib/village';

const WALK_SPEED = 7.5;
const RUN_SPEED = 12.5;
const PLAYER_RADIUS = 0.5;

export function Player() {
  const root = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Mesh>(null);
  const legR = useRef<THREE.Mesh>(null);
  const armL = useRef<THREE.Mesh>(null);
  const armR = useRef<THREE.Mesh>(null);
  const stride = useRef(0);

  const assets = useMemo(
    () => ({
      ...createPlayerGeometries(),
      furMaterial: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true }),
      shirtMaterial: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, flatShading: true }),
    }),
    [],
  );

  // 사자 레이어: 나무·집 뒤에 있어도 실제 모습이 비쳐 보인다
  useEffect(() => markLion(root.current), []);

  // 옷 색은 입장할 때 고른 색
  const shirtColor = useNet((s) => s.profile.color);
  useEffect(() => {
    assets.shirtMaterial.color.set(shirtColor);
  }, [assets, shirtColor]);

  useEffect(
    () => () => {
      assets.head.dispose();
      assets.leg.dispose();
      assets.arm.dispose();
      assets.shirt.dispose();
      assets.furMaterial.dispose();
      assets.shirtMaterial.dispose();
    },
    [assets],
  );

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1); // 탭 전환 후 순간이동 방지
    const { keys, stick } = controls;
    let ix = 0;
    let iy = 0;
    if (!isBlocked()) {
      ix = (keys.right ? 1 : 0) - (keys.left ? 1 : 0) + stick.x;
      iy = (keys.up ? 1 : 0) - (keys.down ? 1 : 0) + stick.y;
    }
    const length = Math.hypot(ix, iy);
    if (length > 1) {
      ix /= length;
      iy /= length;
    }
    const amount = Math.min(1, length);

    if (amount > 0.05) {
      // 카메라가 보는 방향 기준으로 움직인다
      const sin = Math.sin(cameraState.yaw);
      const cos = Math.cos(cameraState.yaw);
      const mx = -sin * iy + cos * ix;
      const mz = -cos * iy - sin * ix;
      const speed = (keys.run ? RUN_SPEED : WALK_SPEED) * amount;
      player.x += mx * speed * delta;
      player.z += mz * speed * delta;
      player.rot = dampAngle(player.rot, Math.atan2(mx, mz), 14, delta);
      player.speed = speed;

      for (const c of village.colliders) {
        const dx = player.x - c.x;
        const dz = player.z - c.z;
        const min = c.r + PLAYER_RADIUS;
        const d2 = dx * dx + dz * dz;
        if (d2 < min * min && d2 > 1e-6) {
          const d = Math.sqrt(d2);
          player.x = c.x + (dx / d) * min;
          player.z = c.z + (dz / d) * min;
        }
      }
      // 섬 밖(모눈 허공)으로는 못 나간다
      player.x = Math.max(-WALK_HALF, Math.min(WALK_HALF, player.x));
      player.z = Math.max(-WALK_HALF, Math.min(WALK_HALF, player.z));
    } else {
      player.speed = 0;
    }

    const group = root.current;
    if (!group) return;
    stride.current += delta * (player.speed > 0 ? 6 + player.speed * 0.9 : 0);
    const swing = player.speed > 0 ? Math.sin(stride.current) * 0.85 : 0;
    const ease = 1 - Math.exp(-18 * delta);
    for (const [limb, target] of [
      [legL.current, swing],
      [legR.current, -swing],
      [armL.current, -swing * 0.8],
      [armR.current, swing * 0.8],
    ] as const) {
      if (limb) limb.rotation.x += (target - limb.rotation.x) * ease;
    }
    group.position.set(player.x, player.speed > 0 ? Math.abs(Math.sin(stride.current)) * 0.09 : 0, player.z);
    group.rotation.y = player.rot;
  });

  return (
    <group ref={root}>
      <mesh geometry={assets.head} material={assets.furMaterial} castShadow />
      <mesh geometry={assets.shirt} material={assets.shirtMaterial} castShadow />
      <mesh ref={legL} geometry={assets.leg} material={assets.furMaterial} position={[-LEG_OFFSET, LIMB_PIVOT.hip, 0]} castShadow />
      <mesh ref={legR} geometry={assets.leg} material={assets.furMaterial} position={[LEG_OFFSET, LIMB_PIVOT.hip, 0]} castShadow />
      <mesh ref={armL} geometry={assets.arm} material={assets.furMaterial} position={[-ARM_OFFSET, LIMB_PIVOT.shoulder, 0]} castShadow />
      <mesh ref={armR} geometry={assets.arm} material={assets.furMaterial} position={[ARM_OFFSET, LIMB_PIVOT.shoulder, 0]} castShadow />
      {/* 방문자 표시: 파란 목도리 */}
      <mesh position={[0, 1.06, 0.02]} castShadow>
        <boxGeometry args={[0.8, 0.14, 0.56]} />
        <meshStandardMaterial color="#1f5fff" roughness={0.9} />
      </mesh>
    </group>
  );
}
