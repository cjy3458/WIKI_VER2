'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { dampAngle } from '@/components/world/geo';
import { createNpcGeometries } from '@/components/world/lionGeometry';
import { useLabelTexture } from '@/components/world/useLabelTexture';
import type { LabelStyle } from '@/components/world/useLabelTexture';
import { BUBBLE_MS, SELF, remotes, useNet } from '@/lib/net';
import type { Peer } from '@/lib/net';
import { player } from '@/lib/store';

const BUBBLE_CHARS = 16;

const BUBBLE_STYLE: LabelStyle = { width: 768, height: 112, fontSize: 40 };
const NAME_STYLE: LabelStyle = { width: 384, height: 96, fontSize: 42, color: '#ffffff', background: '#000000' };

/** 머리 위 말풍선. 채팅을 치면 몇 초 떠 있다 사라진다 */
function Bubble({ id }: { id: string }) {
  const bubble = useNet((s) => s.bubbles[id]);
  const sprite = useRef<THREE.Sprite>(null);
  const chars = bubble ? Array.from(bubble.text) : [];
  const short = chars.length > BUBBLE_CHARS ? `${chars.slice(0, BUBBLE_CHARS).join('')}…` : chars.join('');
  const texture = useLabelTexture(bubble ? short : null, BUBBLE_STYLE);
  const shownAt = bubble?.at ?? 0;

  useFrame(() => {
    if (sprite.current) sprite.current.visible = Date.now() - shownAt < BUBBLE_MS;
  });

  if (!texture) return null;
  return (
    <sprite ref={sprite} position-y={3.95} scale={[6.6, 0.96, 1]} renderOrder={10}>
      <spriteMaterial map={texture} transparent depthWrite={false} depthTest={false} />
    </sprite>
  );
}

interface Assets {
  body: THREE.BufferGeometry;
  shirt: THREE.BufferGeometry;
  bodyMaterial: THREE.Material;
}

function Visitor({ peer, assets }: { peer: Peer; assets: Assets }) {
  const group = useRef<THREE.Group>(null);
  const nameTexture = useLabelTexture(peer.name, NAME_STYLE);

  useFrame((state, delta) => {
    const g = group.current;
    const remote = remotes.get(peer.id);
    if (!g) return;
    // 위치를 아직 못 받았으면 그리지 않는다
    g.visible = Boolean(remote);
    if (!remote) return;
    const ease = 1 - Math.exp(-12 * delta);
    // 너무 멀어졌으면(순간이동) 따라 걷지 않고 바로 옮긴다
    if (Math.hypot(remote.tx - remote.x, remote.tz - remote.z) > 12) {
      remote.x = remote.tx;
      remote.z = remote.tz;
    } else {
      remote.x += (remote.tx - remote.x) * ease;
      remote.z += (remote.tz - remote.z) * ease;
    }
    remote.rot = dampAngle(remote.rot, remote.trot, 12, delta);
    const hop = remote.speed > 0 ? Math.abs(Math.sin(state.clock.elapsedTime * (6 + remote.speed * 0.9))) * 0.12 : 0;
    g.position.set(remote.x, hop, remote.z);
    g.rotation.y = remote.rot;
  });

  return (
    <group ref={group} visible={false}>
      <mesh geometry={assets.body} material={assets.bodyMaterial} castShadow />
      <mesh geometry={assets.shirt} castShadow>
        <meshStandardMaterial color={peer.color} roughness={0.9} flatShading />
      </mesh>
      {nameTexture && (
        <sprite position-y={2.95} scale={[3.4, 0.85, 1]}>
          <spriteMaterial map={nameTexture} transparent depthWrite={false} />
        </sprite>
      )}
      <Bubble id={peer.id} />
    </group>
  );
}

/** 내 말풍선은 내 캐릭터를 따라다닌다 */
function SelfBubble() {
  const group = useRef<THREE.Group>(null);
  useFrame(() => group.current?.position.set(player.x, 0, player.z));
  return (
    <group ref={group}>
      <Bubble id={SELF} />
    </group>
  );
}

/** 지금 함께 접속해 있는 다른 사람들 */
export function Visitors() {
  const peers = useNet((s) => s.peers);
  const muted = useNet((s) => s.muted);
  const assets = useMemo<Assets>(
    () => ({
      ...createNpcGeometries(),
      bodyMaterial: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true }),
    }),
    [],
  );
  useEffect(
    () => () => {
      assets.body.dispose();
      assets.shirt.dispose();
      assets.bodyMaterial.dispose();
    },
    [assets],
  );

  return (
    <>
      {peers
        .filter((p) => !muted.includes(p.id))
        .map((p) => (
          <Visitor key={p.id} peer={p} assets={assets} />
        ))}
      <SelfBubble />
    </>
  );
}
