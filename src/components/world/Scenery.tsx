'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { box, displayFontFamily, mergeAll, pixelTexture } from '@/components/world/geo';
import { createNpcGeometries } from '@/components/world/lionGeometry';
import { useLabelTexture } from '@/components/world/useLabelTexture';
import { player } from '@/lib/store';
import { PLAZA_HALF, WORLD_HALF, landmarks, loungeSeats, village } from '@/lib/village';

// 픽셀 섬의 풍경. 기획: docs/world-design.md — 둥근 것이 없다. 전부 블록이다.

const dummy = new THREE.Object3D();
const color = new THREE.Color();
const BLUE = '#4c4df5';
const SIGN = { width: 512, height: 116, fontSize: 54 };
/** 시야를 가리는 나무·집이 낮아졌을 때의 높이 비율 (밑동만 남는다) */
const CUT_HEIGHT = 0.13;
/** 카메라에서 이 거리 안에 있는 나무·집도 낮춘다 (화면 가장자리를 크게 덮는 것들) */
const NEAR_CAMERA = 11;

// ── 픽셀 텍스처 ─────────────────────────────────

const GRASS = ['GGGgGGGG', 'GGGGGGdG', 'gGGGGGGG', 'GGGGdGGG', 'GGgGGGGG', 'GGGGGGGg', 'dGGGGGGG', 'GGGGGgGG'];
const BRICK = ['TTTTTTTT', 'TTTTTTTT', 'TTTBTTTT', 'BBBBBBBB', 'TTTTTTTT', 'TTTTTTTT', 'TTTTTTTB', 'BBBBBBBB'];
const WATER = ['WWWWWWWW', 'WLLWWWWW', 'WWWWWWLW', 'WWWWWWWW', 'WWWDDWWW', 'WWWWWWWW', 'LWWWWWWW', 'WWWWWDDW'];
const PORTAL = ['ABCDEFAB', 'BCDEFABC', 'CDEFABCD', 'DEFABCDE', 'EFABCDEF', 'FABCDEFA', 'ABCDEFAB', 'BCDEFABC'];
const HEART = ['.XX.XX.', 'XWXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];

function useTextures() {
  const textures = useMemo(() => {
    const tan = { T: '#c9a277', B: '#8a5a44' };
    return {
      grass: pixelTexture(GRASS, { G: '#55b532', g: '#6fcb42', d: '#3f9e22' }, [WORLD_HALF / 2, WORLD_HALF / 2]),
      cliff: pixelTexture(BRICK, tan, [WORLD_HALF / 2, 2]),
      plaza: pixelTexture(['AB', 'BA'], { A: '#fbf6e6', B: '#e6dbbd' }, [PLAZA_HALF / 2, PLAZA_HALF / 2]),
      water: pixelTexture(WATER, { W: '#0aa0e6', L: '#8fdcff', D: '#0b78b8' }, [3.5, 3.5]),
      portal: pixelTexture(PORTAL, { A: '#ff5d8f', B: '#ffd83a', C: '#2fbf87', D: '#39a9f5', E: '#4c4df5', F: '#b05ad6' }, [1, 1]),
      roads: village.roads.map((r) => pixelTexture(BRICK, { T: '#ecd9a6', B: '#c4a66b' }, [r.w / 2.5, r.d / 2.5])),
    };
  }, []);
  useEffect(
    () => () => {
      const { roads, ...rest } = textures;
      [...roads, ...Object.values(rest)].forEach((t) => t.dispose());
    },
    [textures],
  );
  return textures;
}

// ── 반복되는 물체 ───────────────────────────────

/** 여러 번 놓이는 물체를 InstancedMesh 하나로 그린다 */
function Instances<T>({
  geometry,
  items,
  place,
  tint,
  vertexColors = true,
  castShadow = true,
  cutaway,
}: {
  geometry: THREE.BufferGeometry;
  items: T[];
  place: (item: T, object: THREE.Object3D) => void;
  tint?: (item: T) => string;
  vertexColors?: boolean;
  castShadow?: boolean;
  /** 주면, 카메라와 내 캐릭터 사이를 가릴 때 낮아진다. 물체의 자리·반경·높이 */
  cutaway?: (item: T) => { x: number; z: number; r: number; h: number };
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const heights = useRef<Float32Array | null>(null);
  const footprints = useMemo(() => (cutaway ? items.map(cutaway) : null), [items, cutaway]);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ vertexColors, roughness: 1, flatShading: true }),
    [vertexColors],
  );

  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    items.forEach((item, i) => {
      dummy.position.set(0, 0, 0);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      place(item, dummy);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      if (tint) mesh.setColorAt(i, color.set(tint(item)));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items, place, tint]);

  useFrame(({ camera }, delta) => {
    const mesh = ref.current;
    if (!mesh || !footprints) return;
    if (!heights.current || heights.current.length !== items.length) heights.current = new Float32Array(items.length).fill(1);
    const current = heights.current;
    // 카메라 → 내 캐릭터로 가는 시선
    const cx = camera.position.x;
    const cz = camera.position.z;
    const sx = player.x - cx;
    const sz = player.z - cz;
    const length2 = sx * sx + sz * sz || 1;
    const ease = 1 - Math.exp(-12 * delta);
    let changed = false;
    for (let i = 0; i < footprints.length; i++) {
      const f = footprints[i];
      const t = ((f.x - cx) * sx + (f.z - cz) * sz) / length2;
      let blocking = false;
      if (t > -0.05 && t < 1) {
        const off = Math.hypot(f.x - (cx + sx * t), f.z - (cz + sz * t));
        // 그 지점에서 시선의 높이. 시선이 물체 위로 지나가면 가리지 않는다
        const sightY = camera.position.y + (1.4 - camera.position.y) * t;
        blocking = off < f.r && f.h > sightY - 0.6;
      }
      // 카메라 바로 앞에 있는 것은 시선 한가운데가 아니어도 화면을 크게 덮는다
      if (!blocking && Math.hypot(f.x - cx, f.z - cz) < NEAR_CAMERA + f.r) blocking = true;
      const target = blocking ? CUT_HEIGHT : 1;
      if (Math.abs(current[i] - target) < 0.003) continue;
      current[i] += (target - current[i]) * ease;
      dummy.position.set(0, 0, 0);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      place(items[i], dummy);
      dummy.scale.y *= current[i];
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      changed = true;
    }
    if (changed) mesh.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[geometry, material, items.length]} castShadow={castShadow} receiveShadow />;
}

function createHouseGeometries() {
  const walls = mergeAll([
    box(4, 2.6, 4, 0, 1.3, 0, '#fffaf0'),
    box(4.1, 0.3, 4.1, 0, 0.15, 0, '#b9b3a6'),
    box(0.9, 1.5, 0.12, 0, 0.75, 2.02, '#8a5a44'),
    box(0.16, 0.16, 0.16, 0.25, 0.75, 2.1, '#ffd83a'),
    box(0.9, 0.9, 0.12, -1.25, 1.55, 2.02, '#000000'),
    box(0.66, 0.66, 0.14, -1.25, 1.55, 2.03, '#9bd8ff'),
    box(0.9, 0.9, 0.12, 1.25, 1.55, 2.02, '#000000'),
    box(0.66, 0.66, 0.14, 1.25, 1.55, 2.03, '#9bd8ff'),
  ]);
  // 계단식 지붕
  const roof = mergeAll([
    new THREE.BoxGeometry(4.9, 0.75, 4.9).translate(0, 2.95, 0),
    new THREE.BoxGeometry(3.5, 0.75, 3.5).translate(0, 3.7, 0),
    new THREE.BoxGeometry(2.1, 0.75, 2.1).translate(0, 4.45, 0),
  ]);
  return { walls, roof };
}

function createTreeGeometry() {
  return mergeAll([
    box(0.7, 1.7, 0.7, 0, 0.85, 0, '#8a5a44'),
    box(2.7, 1.3, 2.7, 0, 2.3, 0, '#2f9e3a'),
    box(2.0, 1.2, 2.0, 0, 3.5, 0, '#46b84e'),
    box(1.2, 1.0, 1.2, 0, 4.55, 0, '#6fd874'),
  ]);
}

type House = (typeof village.houses)[number];
type Tree = (typeof village.trees)[number];
const placeHouse = (h: House, o: THREE.Object3D) => {
  o.position.set(h.x, 0, h.z);
  o.rotation.y = h.rot;
  o.scale.setScalar(h.scale);
};
const tintHouse = (h: House) => h.color;
const placeTree = (t: Tree, o: THREE.Object3D) => {
  o.position.set(t.x, 0, t.z);
  o.scale.setScalar(t.scale);
};

/** 블록 구름: 구름 하나가 상자 세 개 */
const CLOUD_BLOCKS = Array.from({ length: 14 }, (_, i) => {
  const a = i * 2.399963; // 황금각으로 고르게
  const r = 112 + ((i * 37) % 60);
  const x = Math.round(Math.sin(a) * r);
  const z = Math.round(Math.cos(a) * r);
  const y = 4 + ((i * 13) % 34);
  const s = 2 + ((i * 7) % 3);
  return [
    { x, y, z, sx: s * 4, sy: s, sz: s * 2 },
    { x: x + s, y: y + s, z, sx: s * 2, sy: s, sz: s * 2 },
    { x: x - s * 1.5, y: y + s * 0.5, z: z + s * 0.5, sx: s * 1.5, sy: s, sz: s },
  ];
}).flat();
/** 시야를 가릴 수 있는 범위: 자리, 반경, 높이 */
const houseFootprint = (h: House) => ({ x: h.x, z: h.z, r: 3.9 * h.scale, h: 5 * h.scale });
const treeFootprint = (t: Tree) => ({ x: t.x, z: t.z, r: 2.4 * t.scale, h: 5.1 * t.scale });
const placeCloud = (c: (typeof CLOUD_BLOCKS)[number], o: THREE.Object3D) => {
  o.position.set(c.x, c.y, c.z);
  o.scale.set(c.sx, c.sy, c.sz);
};

function Blocks() {
  const house = useMemo(() => createHouseGeometries(), []);
  const tree = useMemo(() => createTreeGeometry(), []);
  const cloud = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  return (
    <>
      <Instances geometry={house.walls} items={village.houses} place={placeHouse} cutaway={houseFootprint} />
      <Instances geometry={house.roof} items={village.houses} place={placeHouse} tint={tintHouse} vertexColors={false} cutaway={houseFootprint} />
      <Instances geometry={tree} items={village.trees} place={placeTree} cutaway={treeFootprint} />
      <Instances geometry={cloud} items={CLOUD_BLOCKS} place={placeCloud} vertexColors={false} castShadow={false} />
    </>
  );
}

// ── 건축물 ──────────────────────────────────────

/** 건축물 위에 떠 있는 표지판 */
function Sign({ text, y, at }: { text: string; y: number; at: { x: number; z: number } }) {
  const texture = useLabelTexture(text, SIGN);
  const material = useRef<THREE.SpriteMaterial>(null);
  useFrame((_, delta) => {
    if (!material.current) return;
    // 멀리서는 길잡이, 가까이 가면 주변 사자들을 가리지 않게 흐려진다
    const near = Math.hypot(player.x - at.x, player.z - at.z) < 20;
    material.current.opacity += ((near ? 0.22 : 1) - material.current.opacity) * (1 - Math.exp(-8 * delta));
  });
  if (!texture) return null;
  return (
    <sprite position-y={y} scale={[5, 1.13, 1]}>
      <spriteMaterial ref={material} map={texture} transparent depthWrite={false} />
    </sprite>
  );
}

/** 구버전 위키의 창 제목줄에 있던 동그라미 두 개 — 여기서는 네모 */
function WindowDots({ x, y, z }: { x: number; y: number; z: number }) {
  return (
    <>
      {[0, 1.35].map((dx) => (
        <group key={dx} position={[x + dx, y, z]}>
          <mesh>
            <boxGeometry args={[0.95, 0.95, 0.1]} />
            <meshBasicMaterial color="#000000" />
          </mesh>
          <mesh position-z={0.04}>
            <boxGeometry args={[0.5, 0.5, 0.1]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </group>
      ))}
    </>
  );
}

/** 타워 화면: 파란 모눈 위의 위키 로고 */
function useScreenTexture() {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let cancelled = false;
    let created: THREE.Texture | null = null;
    const family = displayFontFamily();
    document.fonts
      .load(`96px ${family}`, 'CAULIKE_LIONWIKI>SPACE 주민검색')
      .catch(() => undefined)
      .then(() => {
        if (cancelled) return;
        const canvas = document.createElement('canvas');
        canvas.width = 704;
        canvas.height = 400;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = BLUE;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(255,255,255,0.28)';
        for (let x = 0; x < canvas.width; x += 44) ctx.fillRect(x, 0, 2, canvas.height);
        for (let y = 0; y < canvas.height; y += 44) ctx.fillRect(0, y, canvas.width, 2);
        ctx.textBaseline = 'top';
        ctx.font = `96px ${family}`;
        ['CAU', 'LIKE_LION', 'WIKI'].forEach((line, i) => {
          ctx.fillStyle = '#000000';
          ctx.fillText(line, 46, 30 + i * 100);
          ctx.fillStyle = '#ffffff';
          ctx.fillText(line, 40, 24 + i * 100);
        });
        ctx.font = `34px ${family}`;
        ctx.fillStyle = '#ffd83a';
        ctx.fillText('> SPACE : 주민 검색_', 40, 346);
        created = new THREE.CanvasTexture(canvas);
        created.colorSpace = THREE.SRGBColorSpace;
        created.anisotropy = 4;
        setTexture(created);
      });
    return () => {
      cancelled = true;
      created?.dispose();
    };
  }, []);
  return texture;
}

/** WIKI 타워: 어디서나 보이는 거대한 모니터. 앞의 키보드가 주민 검색 터미널 */
function Tower() {
  const screen = useScreenTexture();
  const { x, z } = landmarks.tower;
  return (
    <group position={[x, 0, z]}>
      <mesh position-y={0.35} castShadow receiveShadow>
        <boxGeometry args={[9, 0.7, 5]} />
        <meshStandardMaterial color="#d9d9d9" roughness={1} />
      </mesh>
      <mesh position-y={2} castShadow>
        <boxGeometry args={[3, 2.8, 2.4]} />
        <meshStandardMaterial color="#bcbcbc" roughness={1} />
      </mesh>
      {/* 검은 테두리 + 흰 본체 */}
      <mesh position-y={9.1} castShadow>
        <boxGeometry args={[17.4, 12, 4.2]} />
        <meshStandardMaterial color="#000000" roughness={1} />
      </mesh>
      <mesh position-y={9.1}>
        <boxGeometry args={[16.6, 11.2, 4.5]} />
        <meshStandardMaterial color="#ffffff" roughness={1} />
      </mesh>
      {/* 제목줄 */}
      <mesh position={[0, 12.85, 2.27]}>
        <boxGeometry args={[16.6, 0.28, 0.1]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      <WindowDots x={-7.2} y={13.75} z={2.3} />
      <mesh position={[0, 8.05, 2.27]}>
        <planeGeometry args={[15.6, 8.86]} />
        <meshBasicMaterial color={BLUE} toneMapped={false} />
      </mesh>
      {screen && (
        <mesh position={[0, 8.05, 2.3]}>
          <planeGeometry args={[15.6, 8.86]} />
          <meshBasicMaterial map={screen} toneMapped={false} />
        </mesh>
      )}
      {/* 터미널 책상과 키보드 */}
      <group position-z={10}>
        <mesh position-y={0.75} castShadow receiveShadow>
          <boxGeometry args={[4.6, 1.5, 2.6]} />
          <meshStandardMaterial color="#000000" roughness={1} />
        </mesh>
        <mesh position-y={0.8}>
          <boxGeometry args={[4.2, 1.5, 2.8]} />
          <meshStandardMaterial color="#ffffff" roughness={1} />
        </mesh>
        <mesh position={[0, 1.66, 0.1]} rotation-x={-0.12}>
          <boxGeometry args={[3.2, 0.24, 1.3]} />
          <meshStandardMaterial color="#2b2b2b" roughness={1} />
        </mesh>
        <Sign text="WIKI 터미널" y={4.2} at={{ x, z: z + 10 }} />
      </group>
    </group>
  );
}

/** 랜덤 포털: 브라우저 창 모양의 문. 구버전의 "랜덤 문서" */
function Portal({ texture }: { texture: THREE.Texture }) {
  const { x, z } = landmarks.portal;
  const surface = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((_, delta) => {
    const map = surface.current?.map;
    if (map) map.offset.y = (map.offset.y + delta * 0.6) % 1;
  });
  return (
    <group position={[x, 0, z]} rotation-y={-Math.PI / 2}>
      {[-4.3, 4.3].map((px) => (
        <group key={px} position={[px, 4.5, 0]}>
          <mesh castShadow>
            <boxGeometry args={[1.5, 9, 1.5]} />
            <meshStandardMaterial color="#000000" roughness={1} />
          </mesh>
          <mesh>
            <boxGeometry args={[1.1, 9, 1.7]} />
            <meshStandardMaterial color="#ffffff" roughness={1} />
          </mesh>
        </group>
      ))}
      <mesh position-y={10} castShadow>
        <boxGeometry args={[10.1, 2.4, 1.5]} />
        <meshStandardMaterial color="#000000" roughness={1} />
      </mesh>
      <mesh position-y={10}>
        <boxGeometry args={[9.7, 2, 1.7]} />
        <meshStandardMaterial color="#ffffff" roughness={1} />
      </mesh>
      <WindowDots x={-3.9} y={10} z={0.88} />
      <mesh position-y={0.2} receiveShadow>
        <boxGeometry args={[10.1, 0.4, 1.5]} />
        <meshStandardMaterial color="#000000" roughness={1} />
      </mesh>
      <mesh position-y={4.7}>
        <planeGeometry args={[7.2, 8.6]} />
        <meshBasicMaterial ref={surface} map={texture} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <Sign text="랜덤 포털" y={12.7} at={landmarks.portal} />
    </group>
  );
}

/** 모닥불 라운지: 접속자들이 모여 떠드는 곳 */
function Lounge() {
  const { x, z } = landmarks.lounge;
  const flames = useRef<THREE.Group>(null);
  const seats = useMemo(() => loungeSeats(), []);
  useFrame((state) => {
    flames.current?.children.forEach((flame, i) => {
      // 뚝뚝 끊기는 픽셀 불꽃
      const step = Math.floor(state.clock.elapsedTime * 7 + i * 1.7) % 4;
      flame.scale.y = 0.75 + step * 0.16;
    });
  });
  return (
    <>
      <group position={[x, 0, z]}>
        <mesh position-y={0.2} receiveShadow>
          <boxGeometry args={[3.2, 0.4, 3.2]} />
          <meshStandardMaterial color="#8d8d8d" roughness={1} />
        </mesh>
        {[0, Math.PI / 2].map((rot) => (
          <mesh key={rot} position-y={0.6} rotation-y={rot + Math.PI / 4} castShadow>
            <boxGeometry args={[2.6, 0.5, 0.5]} />
            <meshStandardMaterial color="#6b4433" roughness={1} />
          </mesh>
        ))}
        <group ref={flames} position-y={0.85}>
          <mesh position-y={0.7}>
            <boxGeometry args={[1.4, 1.4, 1.4]} />
            <meshBasicMaterial color="#ff5a1f" />
          </mesh>
          <mesh position-y={1.2}>
            <boxGeometry args={[0.9, 1.5, 0.9]} />
            <meshBasicMaterial color="#ffb11f" />
          </mesh>
          <mesh position-y={1.6}>
            <boxGeometry args={[0.45, 1.3, 0.45]} />
            <meshBasicMaterial color="#fff06a" />
          </mesh>
        </group>
        <Sign text="모닥불 라운지" y={6.4} at={landmarks.lounge} />
      </group>
      {seats.map((seat, i) => (
        <mesh key={i} position={[seat.x, 0.4, seat.z]} rotation-y={seat.rot} castShadow receiveShadow>
          <boxGeometry args={[2, 0.8, 0.9]} />
          <meshStandardMaterial color="#8a5a44" roughness={1} />
        </mesh>
      ))}
    </>
  );
}

/** 연못: 구버전 그림의 파란 물 블록 */
function Pond({ texture }: { texture: THREE.Texture }) {
  const { x, z, half } = landmarks.pond;
  const surface = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((_, delta) => {
    const map = surface.current?.map;
    if (map) map.offset.x = (map.offset.x + delta * 0.05) % 1;
  });
  return (
    <group position={[x, 0, z]}>
      <mesh position-y={0.06} receiveShadow>
        <boxGeometry args={[half * 2 + 2, 0.12, half * 2 + 2]} />
        <meshStandardMaterial color="#c9a277" roughness={1} />
      </mesh>
      <mesh position-y={0.22} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[half * 2, half * 2]} />
        <meshBasicMaterial ref={surface} map={texture} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** START 광장: 황금 사자상과 떠 있는 픽셀 하트 */
function Plaza({ texture }: { texture: THREE.Texture }) {
  const hearts = useRef<THREE.Group>(null);
  const assets = useMemo(() => {
    const { body, shirt } = createNpcGeometries();
    const pixel = 0.24;
    const heart = mergeAll(
      HEART.flatMap((row, y) =>
        Array.from(row).flatMap((ch, x) =>
          ch === '.' ? [] : [box(pixel, pixel, pixel, (x - 3) * pixel, (2.5 - y) * pixel, 0, ch === 'W' ? '#ffffff' : '#ff3b5c')],
        ),
      ),
    );
    return { statue: mergeAll([body, shirt]), heart };
  }, []);
  useEffect(
    () => () => {
      assets.statue.dispose();
      assets.heart.dispose();
    },
    [assets],
  );
  useFrame((state) => {
    hearts.current?.children.forEach((heart, i) => {
      heart.position.y = 7.9 + Math.sin(state.clock.elapsedTime * 2 + i * 1.2) * 0.3;
      heart.rotation.y = state.clock.elapsedTime * 1.2 + i;
    });
  });

  return (
    <group>
      <mesh position-y={0.06} receiveShadow>
        <boxGeometry args={[PLAZA_HALF * 2 + 1, 0.12, PLAZA_HALF * 2 + 1]} />
        <meshStandardMaterial color="#000000" roughness={1} />
      </mesh>
      <mesh position-y={0.22} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[PLAZA_HALF * 2, PLAZA_HALF * 2]} />
        <meshStandardMaterial map={texture} roughness={1} />
      </mesh>
      <mesh position-y={0.45} castShadow receiveShadow>
        <boxGeometry args={[4.8, 0.9, 4.8]} />
        <meshStandardMaterial color="#d9d0bf" roughness={1} />
      </mesh>
      <mesh position-y={1.25} castShadow receiveShadow>
        <boxGeometry args={[3.4, 0.8, 3.4]} />
        <meshStandardMaterial color="#c4baa6" roughness={1} />
      </mesh>
      <mesh geometry={assets.statue} position-y={1.65} scale={2.1} castShadow>
        <meshStandardMaterial color="#ffc530" emissive="#a86a00" emissiveIntensity={0.35} roughness={0.55} flatShading />
      </mesh>
      <group ref={hearts}>
        {[-2.2, 0, 2.2].map((hx) => (
          <mesh key={hx} geometry={assets.heart} position={[hx, 7.9, 0]}>
            <meshBasicMaterial vertexColors />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export function Scenery() {
  const textures = useTextures();
  const size = WORLD_HALF * 2;

  return (
    <>
      {/* 섬: 윗면은 잔디, 옆면은 흙벽돌. 바깥은 파란 모눈 허공 */}
      <mesh position-y={-4} receiveShadow>
        <boxGeometry args={[size, 8, size]} />
        <meshStandardMaterial attach="material-0" map={textures.cliff} roughness={1} />
        <meshStandardMaterial attach="material-1" map={textures.cliff} roughness={1} />
        <meshStandardMaterial attach="material-2" map={textures.grass} roughness={1} />
        <meshStandardMaterial attach="material-3" color="#8a5a44" roughness={1} />
        <meshStandardMaterial attach="material-4" map={textures.cliff} roughness={1} />
        <meshStandardMaterial attach="material-5" map={textures.cliff} roughness={1} />
      </mesh>
      {/* 잔디 블록 테두리. 윗면이 섬 윗면(y=0)과 겹치면 두 면이 번갈아 보이며 깜빡인다 → 반드시 더 낮게 */}
      <mesh position-y={-0.75}>
        <boxGeometry args={[size + 1.2, 0.9, size + 1.2]} />
        <meshStandardMaterial color="#0f8f0a" roughness={1} />
      </mesh>

      {village.roads.map((road, i) => (
        <mesh key={i} position={[road.x, 0.1, road.z]} rotation-x={-Math.PI / 2} receiveShadow>
          <planeGeometry args={[road.w, road.d]} />
          <meshStandardMaterial map={textures.roads[i]} roughness={1} />
        </mesh>
      ))}

      <Plaza texture={textures.plaza} />
      <Tower />
      <Portal texture={textures.portal} />
      <Lounge />
      <Pond texture={textures.water} />
      <Blocks />

    </>
  );
}
