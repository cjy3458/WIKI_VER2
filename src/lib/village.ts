import { people } from '@/lib/people';
import type { Part } from '@/types/wiki';

// 마을 배치는 전부 여기서 계산한다. 시드 고정 난수만 써서 언제 열어도 같은 자리에 같은 사람이 서 있다.
// 기수별 구역은 없다. 11기·12기가 한 마을에 섞여 흩어져 있다.

export interface Circle {
  x: number;
  z: number;
  r: number;
}

export interface Npc {
  id: number;
  name: string;
  part: Part;
  x: number;
  z: number;
  /** 기본으로 바라보는 방향. 0이면 +z, 시계 반대 방향 라디안 */
  rot: number;
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

export const WORLD_RADIUS = 80;
export const PLAZA_RADIUS = 11;
export const SPAWN = { x: 0, z: 7.5, rot: Math.PI };

/** 주민이 서 있는 범위 (광장 바깥 ~ 마을 가장자리) */
const NPC_MIN_RADIUS = 13;
const NPC_MAX_RADIUS = 60;
const NPC_SPACING = 8;
const PATH_END = 68;
const ROOF_COLORS = ['#ff8a3d', '#2fbf87', '#39a9f5', '#ff5d8f', '#f2b21d', '#8f7dff'];

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
  const far = (list: { x: number; z: number }[], x: number, z: number, min: number) =>
    list.every((o) => Math.hypot(x - o.x, z - o.z) >= min);

  // 1) 광장에서 네 방향으로 뻗는 길
  const roads = [0, 1, 2, 3].map((i) => {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    return { ax: Math.sin(a) * (PLAZA_RADIUS - 1), az: Math.cos(a) * (PLAZA_RADIUS - 1), bx: Math.sin(a) * PATH_END, bz: Math.cos(a) * PATH_END, a };
  });
  const paths: Path[] = roads.map((r) => ({
    x: (r.ax + r.bx) / 2,
    z: (r.az + r.bz) / 2,
    length: PATH_END - PLAZA_RADIUS + 1,
    rot: r.a,
  }));
  const roadDistance = (x: number, z: number) => Math.min(...roads.map((r) => distanceToSegment(x, z, r.ax, r.az, r.bx, r.bz)));

  // 2) 주민: 기수·파트와 상관없이 마을 여기저기에 흩어 세운다
  const npcs: Npc[] = [];
  for (const person of [...people].sort((a, b) => a.id - b.id)) {
    let spacing = NPC_SPACING;
    for (let attempt = 0; ; attempt++) {
      // 자리가 안 나면 간격을 조금씩 좁힌다
      if (attempt > 0 && attempt % 200 === 0) spacing *= 0.9;
      const r = Math.sqrt(NPC_MIN_RADIUS ** 2 + rand() * (NPC_MAX_RADIUS ** 2 - NPC_MIN_RADIUS ** 2));
      const a = rand() * Math.PI * 2;
      const x = Math.sin(a) * r;
      const z = Math.cos(a) * r;
      if (!far(npcs, x, z, spacing)) continue;
      // 대체로 광장 쪽을 보되 제각각
      npcs.push({ id: person.id, name: person.name, part: person.part, x, z, rot: Math.atan2(-x, -z) + (rand() - 0.5) * 2.4 });
      break;
    }
  }

  // 3) 집
  const houses: House[] = [];
  for (let attempt = 0; attempt < 3000 && houses.length < 30; attempt++) {
    const r = 16 + Math.sqrt(rand()) * 56;
    const a = rand() * Math.PI * 2;
    const x = Math.sin(a) * r;
    const z = Math.cos(a) * r;
    if (!far(npcs, x, z, 6.5) || !far(houses, x, z, 11) || roadDistance(x, z) < 6) continue;
    houses.push({
      x,
      z,
      rot: Math.atan2(-x, -z) + (rand() - 0.5) * 1.2,
      scale: 0.9 + rand() * 0.4,
      color: ROOF_COLORS[houses.length % ROOF_COLORS.length],
    });
  }

  // 4) 나무: 마을 안에는 드문드문, 바깥은 숲
  const trees: Tree[] = [];
  for (let attempt = 0; attempt < 6000 && trees.length < 300; attempt++) {
    const r = Math.sqrt(rand()) * (WORLD_RADIUS + 22);
    const a = rand() * Math.PI * 2;
    const x = Math.sin(a) * r;
    const z = Math.cos(a) * r;
    const scale = 0.8 + rand() * 0.9;
    const inside = r < NPC_MAX_RADIUS + 4;
    if (r < PLAZA_RADIUS + 3) continue;
    if (inside && rand() < 0.55) continue;
    if (!far(npcs, x, z, 3.2) || !far(houses, x, z, 5) || !far(trees, x, z, inside ? 6 : 3.8)) continue;
    if (roadDistance(x, z) < 3.6) continue;
    trees.push({ x, z, scale });
  }

  // 5) 충돌체 (전부 원)
  const colliders: Circle[] = [
    { x: 0, z: 0, r: 2.6 }, // 광장 동상
    ...houses.map((h) => ({ x: h.x, z: h.z, r: 2.5 * h.scale })),
    ...trees.map((t) => ({ x: t.x, z: t.z, r: 0.55 * t.scale })),
    ...npcs.map((n) => ({ x: n.x, z: n.z, r: 0.6 })),
  ];

  return { npcs, houses, trees, paths, colliders };
}

export const village = build();

const npcById = new Map(village.npcs.map((n) => [n.id, n]));
export const getNpc = (id: number | null) => (id === null ? undefined : npcById.get(id));

const STAND_DISTANCE = 2.4;

/** 그 주민 바로 앞, 아무것도 없는 자리. 순간이동할 때 쓴다 */
export function spotNear(npc: Npc) {
  for (let k = 0; k < 8; k++) {
    // 주민이 보고 있는 쪽부터 시계 방향으로 돌아가며 빈자리를 찾는다
    const a = npc.rot + (k * Math.PI) / 4;
    const x = npc.x + Math.sin(a) * STAND_DISTANCE;
    const z = npc.z + Math.cos(a) * STAND_DISTANCE;
    const blocked = village.colliders.some((c) => Math.hypot(x - c.x, z - c.z) < c.r + 0.55);
    if (!blocked && Math.hypot(x, z) < WORLD_RADIUS) return { x, z, rot: Math.atan2(npc.x - x, npc.z - z) };
  }
  return { x: npc.x, z: npc.z + STAND_DISTANCE, rot: Math.PI };
}
