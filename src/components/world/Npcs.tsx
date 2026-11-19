'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { LAYER, createLabelTexture, dampAngle, displayFontFamily } from '@/components/world/geo';
import { createNpcGeometries } from '@/components/world/lionGeometry';
import { PART_COLOR } from '@/lib/people';
import { isBlocked, player, useGame } from '@/lib/store';
import { village } from '@/lib/village';

const TALK_RANGE = 3.4;
const LOOK_RANGE = 7;
const TAG_RANGE = 44;

const dummy = new THREE.Object3D();
const color = new THREE.Color();

/** 주민 전원. 몸통과 옷 두 개의 InstancedMesh 로 그린다 */
export function Npcs() {
  const npcs = village.npcs;
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const shirtRef = useRef<THREE.InstancedMesh>(null);
  const rotations = useRef<Float32Array | null>(null);

  const assets = useMemo(() => {
    const geometries = createNpcGeometries();
    return {
      ...geometries,
      bodyMaterial: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true }),
      shirtMaterial: new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }),
    };
  }, []);

  useEffect(
    () => () => {
      assets.body.dispose();
      assets.shirt.dispose();
      assets.bodyMaterial.dispose();
      assets.shirtMaterial.dispose();
    },
    [assets],
  );

  // 사자 레이어: 나무·집 뒤에 있어도 실제 모습이 비쳐 보인다
  useLayoutEffect(() => {
    bodyRef.current?.layers.enable(LAYER.lion);
    shirtRef.current?.layers.enable(LAYER.lion);
  }, []);

  useLayoutEffect(() => {
    const shirt = shirtRef.current;
    if (!shirt) return;
    npcs.forEach((npc, i) => shirt.setColorAt(i, color.set(PART_COLOR[npc.part])));
    if (shirt.instanceColor) shirt.instanceColor.needsUpdate = true;
  }, [npcs]);

  useFrame((state, delta) => {
    const body = bodyRef.current;
    const shirt = shirtRef.current;
    if (!body || !shirt) return;
    if (!rotations.current) rotations.current = Float32Array.from(npcs, (n) => n.rot);
    const rots = rotations.current;
    const t = state.clock.elapsedTime;

    let nearest: number | null = null;
    let nearestDistance = TALK_RANGE;

    for (let i = 0; i < npcs.length; i++) {
      const npc = npcs[i];
      const dx = player.x - npc.x;
      const dz = player.z - npc.z;
      const distance = Math.hypot(dx, dz);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = npc.id;
      }
      // 가까이 오면 플레이어 쪽을 본다
      const target = distance < LOOK_RANGE ? Math.atan2(dx, dz) : npc.rot;
      rots[i] = dampAngle(rots[i], target, 6, delta);

      dummy.position.set(npc.x, Math.abs(Math.sin(t * 1.6 + i * 1.7)) * 0.05, npc.z);
      dummy.rotation.set(0, rots[i], 0);
      dummy.updateMatrix();
      body.setMatrixAt(i, dummy.matrix);
      shirt.setMatrixAt(i, dummy.matrix);
    }
    body.instanceMatrix.needsUpdate = true;
    shirt.instanceMatrix.needsUpdate = true;

    useGame.getState().setNearby(isBlocked() ? null : nearest);
  });

  return (
    <>
      <instancedMesh
        ref={bodyRef}
        args={[assets.body, assets.bodyMaterial, npcs.length]}
        castShadow
        frustumCulled={false}
      />
      <instancedMesh
        ref={shirtRef}
        args={[assets.shirt, assets.shirtMaterial, npcs.length]}
        castShadow
        frustumCulled={false}
      />
      <NameTags />
    </>
  );
}

/** 머리 위 이름표. DOM 대신 캔버스 텍스처 스프라이트 */
function NameTags() {
  const groupRef = useRef<THREE.Group>(null);
  const updateVisibility = useRef<(() => void) | null>(null);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    let cancelled = false;
    let frame = 0;
    // 매 프레임 볼 필요는 없다
    updateVisibility.current = () => {
      if (frame++ % 6 !== 0) return;
      for (const { sprite } of created) {
        sprite.visible = Math.hypot(sprite.position.x - player.x, sprite.position.z - player.z) < TAG_RANGE;
      }
    };
    const created: { sprite: THREE.Sprite; material: THREE.SpriteMaterial; texture: THREE.Texture }[] = [];

    const fontFamily = displayFontFamily();
    const allNames = village.npcs.map((n) => n.name).join('');
    // 한글 웹폰트는 글자 범위별로 쪼개져 있어서, 쓸 글자를 알려 주고 받아 온 뒤에 그려야 한다
    document.fonts
      .load(`44px ${fontFamily}`, allNames)
      .catch(() => undefined)
      .then(() => {
        if (cancelled) return;
        for (const npc of village.npcs) {
          const texture = createLabelTexture(npc.name, {
            width: 320,
            height: 96,
            fontSize: 44,
            fontFamily,
            accent: PART_COLOR[npc.part],
          });
          // 이름표는 무엇에도 가려지지 않는다
          const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, depthTest: false });
          const sprite = new THREE.Sprite(material);
          sprite.layers.set(LAYER.tag);
          sprite.position.set(npc.x, 2.95, npc.z);
          sprite.scale.set(3, 0.9, 1);
          sprite.visible = false;
          group.add(sprite);
          created.push({ sprite, material, texture });
        }
      });

    return () => {
      cancelled = true;
      updateVisibility.current = null;
      for (const { sprite, material, texture } of created) {
        group.remove(sprite);
        material.dispose();
        texture.dispose();
      }
    };
  }, []);

  useFrame(() => updateVisibility.current?.());

  return <group ref={groupRef} />;
}
