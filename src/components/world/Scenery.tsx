'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { box, mergeAll, paint } from '@/components/world/geo';
import { LION, createNpcGeometries } from '@/components/world/lionGeometry';
import { PLAZA_RADIUS, WORLD_RADIUS, village } from '@/lib/village';

const dummy = new THREE.Object3D();
const color = new THREE.Color();

const GROUND = '#8ccf63';
const SAND = '#f2e2b1';
const PATH = '#e8d39c';

/** 여러 번 놓이는 물체를 InstancedMesh 하나로 그린다 */
function Instances<T>({
  geometry,
  items,
  place,
  tint,
  vertexColors = true,
  castShadow = true,
}: {
  geometry: THREE.BufferGeometry;
  items: T[];
  place: (item: T, object: THREE.Object3D) => void;
  tint?: (item: T) => string;
  vertexColors?: boolean;
  castShadow?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ vertexColors, roughness: 0.95, flatShading: true }),
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

  return <instancedMesh ref={ref} args={[geometry, material, items.length]} castShadow={castShadow} receiveShadow />;
}

function createHouseGeometries() {
  const walls = mergeAll([
    box(3.6, 2.5, 3.3, 0, 1.25, 0, '#fff6e3'),
    box(0.8, 1.4, 0.1, 0, 0.7, 1.67, '#8a5a3c'),
    box(0.7, 0.7, 0.1, -1.1, 1.5, 1.67, '#9bd8ff'),
    box(0.7, 0.7, 0.1, 1.1, 1.5, 1.67, '#9bd8ff'),
    box(0.5, 1.2, 0.5, 1.1, 3.5, -0.6, '#c9b79a'),
  ]);
  const roof = new THREE.ConeGeometry(3.1, 1.9, 4, 1).rotateY(Math.PI / 4).translate(0, 3.45, 0);
  return { walls, roof };
}

function createTreeGeometry() {
  return mergeAll([
    paint(new THREE.CylinderGeometry(0.22, 0.32, 1.5, 6).translate(0, 0.75, 0), '#8a5a3c'),
    paint(new THREE.ConeGeometry(1.5, 2.2, 7).translate(0, 2.4, 0), '#3f9e4d'),
    paint(new THREE.ConeGeometry(1.15, 1.9, 7).translate(0, 3.5, 0), '#4fb35c'),
    paint(new THREE.ConeGeometry(0.75, 1.5, 7).translate(0, 4.5, 0), '#63c56d'),
  ]);
}

const placeHouse = (h: (typeof village.houses)[number], o: THREE.Object3D) => {
  o.position.set(h.x, 0, h.z);
  o.rotation.y = h.rot;
  o.scale.setScalar(h.scale);
};
const tintHouse = (h: (typeof village.houses)[number]) => h.color;
const placeTree = (t: (typeof village.trees)[number], o: THREE.Object3D) => {
  o.position.set(t.x, 0, t.z);
  o.rotation.y = t.x * 1.3 + t.z;
  o.scale.setScalar(t.scale);
};
const tintTree = (t: (typeof village.trees)[number]) => (t.scale > 1.3 ? '#e4ffd9' : '#ffffff');

const CLOUDS = Array.from({ length: 16 }, (_, i) => {
  const a = i * 2.399963; // 황금각으로 고르게
  const r = 30 + ((i * 37) % 90);
  return { x: Math.sin(a) * r, y: 42 + ((i * 13) % 16), z: Math.cos(a) * r, s: 5 + ((i * 7) % 6) };
});
const placeCloud = (c: (typeof CLOUDS)[number], o: THREE.Object3D) => {
  o.position.set(c.x, c.y, c.z);
  o.scale.set(c.s * 1.8, c.s * 0.55, c.s);
};

function Buildings() {
  const house = useMemo(() => createHouseGeometries(), []);
  const tree = useMemo(() => createTreeGeometry(), []);
  const cloud = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []);
  return (
    <>
      <Instances geometry={house.walls} items={village.houses} place={placeHouse} />
      <Instances geometry={house.roof} items={village.houses} place={placeHouse} tint={tintHouse} vertexColors={false} />
      <Instances geometry={tree} items={village.trees} place={placeTree} tint={tintTree} />
      <Instances geometry={cloud} items={CLOUDS} place={placeCloud} vertexColors={false} castShadow={false} />
    </>
  );
}

/** 광장 한가운데 황금 사자상 */
function Monument() {
  const statue = useMemo(() => {
    const { body, shirt } = createNpcGeometries();
    return mergeAll([body, shirt]);
  }, []);
  useEffect(() => () => statue.dispose(), [statue]);

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position-y={0.03} receiveShadow>
        <circleGeometry args={[PLAZA_RADIUS, 48]} />
        <meshStandardMaterial color={SAND} roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.05} receiveShadow>
        <ringGeometry args={[PLAZA_RADIUS - 0.8, PLAZA_RADIUS, 64]} />
        <meshStandardMaterial color={LION.mane} roughness={1} />
      </mesh>
      <mesh position-y={0.4} castShadow receiveShadow>
        <cylinderGeometry args={[2.4, 2.7, 0.8, 8]} />
        <meshStandardMaterial color="#d9d0bf" roughness={1} flatShading />
      </mesh>
      <mesh position-y={1.2} castShadow receiveShadow>
        <cylinderGeometry args={[1.7, 1.9, 0.8, 8]} />
        <meshStandardMaterial color="#c9bfad" roughness={1} flatShading />
      </mesh>
      <mesh geometry={statue} position-y={1.6} scale={2.1} castShadow>
        <meshStandardMaterial color="#ffc530" emissive="#a86a00" emissiveIntensity={0.35} roughness={0.55} flatShading />
      </mesh>
    </group>
  );
}

export function Scenery() {
  return (
    <>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[WORLD_RADIUS + 60, 72]} />
        <meshStandardMaterial color={GROUND} roughness={1} />
      </mesh>
      {village.paths.map((p, i) => (
        <mesh key={i} position={[p.x, 0.02, p.z]} rotation-y={p.rot} receiveShadow>
          <boxGeometry args={[4.6, 0.02, p.length]} />
          <meshStandardMaterial color={PATH} roughness={1} />
        </mesh>
      ))}
      <Monument />
      <Buildings />
    </>
  );
}
