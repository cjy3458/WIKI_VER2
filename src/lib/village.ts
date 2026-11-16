import { people } from '@/lib/people';
import type { Part } from '@/types/wiki';

// 픽셀 섬의 배치는 전부 여기서 계산한다. 기획: docs/world-design.md
// 시드 고정 난수만 써서 언제 열어도 같은 자리에 같은 사람이 서 있다.
// 기수별 구역은 없다. 11기·12기가 한 섬에 섞여 흩어져 있다.

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

/** 격자 방향으로만 뻗는 길 (중심, 가로·세로 크기) */
export interface Road {
  x: number;
  z: number;
  w: number;
  d: number;
}

/** `Space` 로 쓸 수 있는 장치 */
export interface Spot {
  id: 'terminal' | 'portal';
  x: number;
  z: number;
  label: string;
}

/** 섬은 한 변이 WORLD_HALF × 2 인 정사각형 */
export const WORLD_HALF = 72;
/** 걸어 다닐 수 있는 한계 (가장자리에서 조금 안쪽) */
export const WALK_HALF = WORLD_HALF - 1.5;
/** 섬 어디든 포함하는 반경 — 받은 좌표 검증용 */
export const WORLD_RADIUS = WORLD_HALF * Math.SQRT2;
export const PLAZA_HALF = 10;
// 정면의 사자상에 정통으로 막히지 않게 살짝 옆에서 시작한다
export const SPAWN = { x: 1.5, z: 6.5, rot: Math.PI };

export const landmarks = {
  /** WIKI 타워: 북쪽 끝의 거대한 모니터. 남쪽(광장)을 본다 */
  tower: { x: 0, z: -52 },
  /** 랜덤 포털: 동쪽의 브라우저 창 모양 문. 서쪽(광장)을 본다 */
  portal: { x: 50, z: 0 },
  /** 모닥불 라운지: 서쪽 */
  lounge: { x: -48, z: 0 },
  /** 연못: 남동쪽 */
  pond: { x: 34, z: 40, half: 7 },
} as const;

const ROAD_WIDTH = 5;
const NPC_SPACING = 8.5;
const ROOF_COLORS = ['#e2574c', '#4c4df5', '#2fa84f', '#f2a81d', '#b05ad6', '#19a5c9'];

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

function build() {
  const rand = mulberry32(20240106); // 위키 첫 문서가 만들어진 날
  const { tower, portal, lounge, pond } = landmarks;
  const far = (list: { x: number; z: number }[], x: number, z: number, min: number) =>
    list.every((o) => Math.hypot(x - o.x, z - o.z) >= min);

  // 1) 길: 광장에서 네 방향, 격자에 맞춰 곧게
  const roads: Road[] = [
    { x: 0, z: (-PLAZA_HALF + tower.z + 9) / 2, w: ROAD_WIDTH, d: -tower.z - 9 - PLAZA_HALF },
    { x: (PLAZA_HALF + portal.x - 4) / 2, z: 0, w: portal.x - 4 - PLAZA_HALF, d: ROAD_WIDTH },
    { x: (-PLAZA_HALF + lounge.x + 7) / 2, z: 0, w: -lounge.x - 7 - PLAZA_HALF, d: ROAD_WIDTH },
    { x: 0, z: (PLAZA_HALF + 58) / 2, w: ROAD_WIDTH, d: 58 - PLAZA_HALF },
  ];
  const onRoad = (x: number, z: number, margin: number) =>
    roads.some((r) => Math.abs(x - r.x) < r.w / 2 + margin && Math.abs(z - r.z) < r.d / 2 + margin);

  // 건축물이 차지하는 자리 (주민·집·나무가 피한다)
  const reserved: Circle[] = [
    { x: tower.x, z: tower.z + 3, r: 17 },
    { x: portal.x, z: portal.z, r: 10 },
    { x: lounge.x, z: lounge.z, r: 10 },
    { x: pond.x, z: pond.z, r: pond.half * 1.6 },
  ];
  const free = (x: number, z: number, margin: number) =>
    Math.max(Math.abs(x), Math.abs(z)) > PLAZA_HALF + margin &&
    reserved.every((c) => Math.hypot(x - c.x, z - c.z) > c.r + margin - 2);
  const pick = (half: number) => [(rand() * 2 - 1) * half, (rand() * 2 - 1) * half] as const;

  // 2) 주민: 기수·파트와 상관없이 섬 여기저기에
  const npcs: Npc[] = [];
  for (const person of [...people].sort((a, b) => a.id - b.id)) {
    let spacing = NPC_SPACING;
    for (let attempt = 0; ; attempt++) {
      // 자리가 안 나면 간격을 조금씩 좁힌다
      if (attempt > 0 && attempt % 200 === 0) spacing *= 0.9;
      const [x, z] = pick(WORLD_HALF - 9);
      if (!free(x, z, 3) || onRoad(x, z, 1.2) || !far(npcs, x, z, spacing)) continue;
      // 대체로 광장 쪽을 보되 제각각
      npcs.push({ id: person.id, name: person.name, part: person.part, x, z, rot: Math.atan2(-x, -z) + (rand() - 0.5) * 2.4 });
      break;
    }
  }

  // 3) 집: 네 방향 중 하나를 본다
  const houses: House[] = [];
  for (let attempt = 0; attempt < 4000 && houses.length < 26; attempt++) {
    const [x, z] = pick(WORLD_HALF - 8);
    if (!free(x, z, 5) || onRoad(x, z, 4.5) || !far(npcs, x, z, 6.5) || !far(houses, x, z, 13)) continue;
    houses.push({
      x: Math.round(x),
      z: Math.round(z),
      rot: (Math.floor(rand() * 4) * Math.PI) / 2,
      scale: 0.95 + rand() * 0.3,
      color: ROOF_COLORS[houses.length % ROOF_COLORS.length],
    });
  }

  // 4) 나무
  const trees: Tree[] = [];
  for (let attempt = 0; attempt < 8000 && trees.length < 170; attempt++) {
    const [x, z] = pick(WORLD_HALF - 3);
    if (!free(x, z, 2) || onRoad(x, z, 1.8)) continue;
    if (!far(npcs, x, z, 3.4) || !far(houses, x, z, 5.2) || !far(trees, x, z, 5.5)) continue;
    trees.push({ x: Math.round(x * 2) / 2, z: Math.round(z * 2) / 2, scale: 0.85 + rand() * 0.6 });
  }

  // 5) 장치
  const spots: Spot[] = [
    { id: 'terminal', x: tower.x, z: tower.z + 13.2, label: '검색 터미널 켜기' },
    { id: 'portal', x: portal.x - 3.2, z: portal.z, label: '랜덤 포털 타기' },
  ];

  // 6) 충돌체 (전부 원)
  const colliders: Circle[] = [
    { x: 0, z: 0, r: 2.6 }, // 광장 사자상
    // 타워: 모니터 본체 + 받침 + 터미널 책상
    ...[-6, -3, 0, 3, 6].map((dx) => ({ x: tower.x + dx, z: tower.z, r: 2.6 })),
    { x: tower.x, z: tower.z + 10, r: 2.4 },
    // 포털 양쪽 기둥
    { x: portal.x, z: portal.z - 4.3, r: 1.2 },
    { x: portal.x, z: portal.z + 4.3, r: 1.2 },
    { x: portal.x + 1.5, z: portal.z, r: 3.4 },
    // 모닥불과 통나무 의자
    { x: lounge.x, z: lounge.z, r: 1.7 },
    ...loungeSeats().map((s) => ({ x: s.x, z: s.z, r: 0.9 })),
    { x: pond.x, z: pond.z, r: pond.half + 0.8 },
    ...houses.map((h) => ({ x: h.x, z: h.z, r: 2.6 * h.scale })),
    ...trees.map((t) => ({ x: t.x, z: t.z, r: 0.6 * t.scale })),
    ...npcs.map((n) => ({ x: n.x, z: n.z, r: 0.6 })),
  ];

  return { npcs, houses, trees, roads, spots, colliders };
}

/** 모닥불을 둘러싼 통나무 의자 자리 */
export function loungeSeats() {
  const { lounge } = landmarks;
  return Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    return { x: lounge.x + Math.sin(a) * 4.6, z: lounge.z + Math.cos(a) * 4.6, rot: a };
  });
}

export const village = build();

const npcById = new Map(village.npcs.map((n) => [n.id, n]));
export const getNpc = (id: number | null) => (id === null ? undefined : npcById.get(id));
export const getSpot = (id: Spot['id'] | null) => village.spots.find((s) => s.id === id);

const STAND_DISTANCE = 2.4;

/** 그 주민 바로 앞, 아무것도 없는 자리. 순간이동할 때 쓴다 */
export function spotNear(npc: Npc) {
  for (let k = 0; k < 8; k++) {
    // 주민이 보고 있는 쪽부터 시계 방향으로 돌아가며 빈자리를 찾는다
    const a = npc.rot + (k * Math.PI) / 4;
    const x = npc.x + Math.sin(a) * STAND_DISTANCE;
    const z = npc.z + Math.cos(a) * STAND_DISTANCE;
    const blocked = village.colliders.some((c) => Math.hypot(x - c.x, z - c.z) < c.r + 0.55);
    if (!blocked && Math.max(Math.abs(x), Math.abs(z)) < WALK_HALF) return { x, z, rot: Math.atan2(npc.x - x, npc.z - z) };
  }
  return { x: npc.x, z: npc.z + STAND_DISTANCE, rot: Math.PI };
}
