import { GEN_COLOR, PART_ORDER, homeOf, people } from '@/lib/people';
import type { Part } from '@/types/wiki';

// 마을 배치는 전부 여기서 계산한다. 시드 고정 난수만 써서 언제 열어도 같은 자리에 같은 사람이 서 있다.

export interface Circle {
  x: number;
  z: number;
  r: number;
}

export interface Npc {
  id: number;
  name: string;
  part: Part;
  home: number;
  x: number;
  z: number;
  /** 기본으로 바라보는 방향. 0이면 +z, 시계 반대 방향 라디안 */
  rot: number;
}

export interface District {
  gen: number;
  x: number;
  z: number;
  radius: number;
  /** 광장에서 본 방향 (0 = 북쪽, 시계 방향) */
  angle: number;
  color: string;
  count: number;
}

export interface House {
  x: number;
  z: number;
  rot: number;
  scale: number;
  color: string;
}

export interface Tree {
  x: number;
  z: number;
  scale: number;
}

export interface Path {
  x: number;
  z: number;
  length: number;
  rot: number;
}

export const WORLD_RADIUS = 104;
export const PLAZA_RADIUS = 12;
export const SPAWN = { x: 0, z: 8, rot: Math.PI };

const DISTRICT_DISTANCE = 54;
/** 광장 기준 각 기수 마을의 방위(도). 11·12기가 입장했을 때 정면 좌우에 오도록 */
const DISTRICT_ANGLE: Record<number, number> = { 11: -36, 12: 36, 10: -104, 13: 104, 9: -158, 14: 158 };
const RING_START = 6;
const RING_GAP = 4.6;
const NPC_SPACING = 4.4;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function distanceToSegment(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
  const dx = bx - ax;
  const dz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}

function build() {
  const rand = mulberry32(20240106); // 위키 첫 문서가 만들어진 날

  // 1) 기수별로 묶기
  const groups = new Map<number, typeof people>();
  for (const person of people) {
    const gen = homeOf(person);
    if (!groups.has(gen)) groups.set(gen, []);
    groups.get(gen)!.push(person);
  }

  const districts: District[] = [];
  const npcs: Npc[] = [];
  const houses: House[] = [];

  for (const gen of [...groups.keys()].sort((a, b) => a - b)) {
    const members = [...groups.get(gen)!].sort(
      (a, b) => PART_ORDER.indexOf(a.part) - PART_ORDER.indexOf(b.part) || a.name.localeCompare(b.name, 'ko'),
    );
    const angle = ((DISTRICT_ANGLE[gen] ?? 0) * Math.PI) / 180;
    const cx = Math.sin(angle) * DISTRICT_DISTANCE;
    const cz = -Math.cos(angle) * DISTRICT_DISTANCE;
    // 광장(원점)을 향하는 방향
    const toPlaza = Math.atan2(-cx, -cz);

    // 2) 동심원으로 세우기. 같은 파트끼리 이웃하게 된다
    let placed = 0;
    let ring = 0;
    let lastRadius = RING_START;
    while (placed < members.length) {
      const radius = RING_START + RING_GAP * ring;
      const capacity = Math.floor((2 * Math.PI * radius) / NPC_SPACING);
      const count = Math.min(capacity, members.length - placed);
      for (let i = 0; i < count; i++) {
        const person = members[placed + i];
        // 입구(광장 방향)가 두 사람 사이에 오도록 반 칸 민다
        const a = toPlaza + ((i + 0.5) / count) * Math.PI * 2;
        npcs.push({
          id: person.id,
          name: person.name,
          part: person.part,
          home: gen,
          x: cx + Math.sin(a) * radius + (rand() - 0.5) * 0.5,
          z: cz + Math.cos(a) * radius + (rand() - 0.5) * 0.5,
          rot: toPlaza + (rand() - 0.5) * 0.9,
        });
      }
      placed += count;
      lastRadius = radius;
      ring++;
    }

    const radius = lastRadius + 5;
    districts.push({ gen, x: cx, z: cz, radius, angle, color: GEN_COLOR[gen] ?? '#888888', count: members.length });

    // 3) 마을 둘레에 집. 입구 쪽은 비워 둔다
    const houseRing = radius + 3.2;
    const houseCount = Math.floor((2 * Math.PI * houseRing) / 9.5);
    for (let i = 0; i < houseCount; i++) {
      const offset = ((i + 0.5) / houseCount) * Math.PI * 2;
      const fromEntrance = Math.min(offset, Math.PI * 2 - offset);
      if (fromEntrance < 0.5) continue;
      const a = toPlaza + offset;
      houses.push({
        x: cx + Math.sin(a) * houseRing,
        z: cz + Math.cos(a) * houseRing,
        rot: a + Math.PI,
        scale: 0.9 + rand() * 0.35,
        color: GEN_COLOR[gen] ?? '#888888',
      });
    }
  }

  // 4) 광장 → 마을 길
  const paths: Path[] = districts.map((d) => {
    const dist = Math.hypot(d.x, d.z);
    const length = dist - d.radius - PLAZA_RADIUS + 3;
    const mid = PLAZA_RADIUS - 1.5 + length / 2;
    return { x: (d.x / dist) * mid, z: (d.z / dist) * mid, length, rot: Math.atan2(d.x, d.z) };
  });

  // 5) 나무: 마을·광장·길을 피해 흩뿌린다
  const trees: Tree[] = [];
  for (let attempt = 0; attempt < 4000 && trees.length < 260; attempt++) {
    const r = Math.sqrt(rand()) * (WORLD_RADIUS + 14);
    const a = rand() * Math.PI * 2;
    const x = Math.sin(a) * r;
    const z = Math.cos(a) * r;
    const scale = 0.8 + rand() * 0.9;
    if (Math.hypot(x, z) < PLAZA_RADIUS + 3) continue;
    if (districts.some((d) => Math.hypot(x - d.x, z - d.z) < d.radius + 8)) continue;
    if (districts.some((d) => distanceToSegment(x, z, 0, 0, d.x, d.z) < 4.5)) continue;
    if (trees.some((t) => Math.hypot(x - t.x, z - t.z) < 4.2)) continue;
    trees.push({ x, z, scale });
  }

  // 6) 충돌체 (전부 원)
  const colliders: Circle[] = [
    { x: 0, z: 0, r: 2.6 }, // 광장 동상
    ...districts.map((d) => ({ x: d.x, z: d.z, r: 1.1 })), // 마을 깃대
    ...houses.map((h) => ({ x: h.x, z: h.z, r: 2.5 * h.scale })),
    ...trees.map((t) => ({ x: t.x, z: t.z, r: 0.55 * t.scale })),
    ...npcs.map((n) => ({ x: n.x, z: n.z, r: 0.6 })),
  ];

  return { districts, npcs, houses, trees, paths, colliders };
}

export const village = build();

const npcById = new Map(village.npcs.map((n) => [n.id, n]));
export const getNpc = (id: number | null) => (id === null ? undefined : npcById.get(id));
