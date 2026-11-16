import raw from '@/data/generated/people.json';
import type { Part, Person, WikiData } from '@/types/wiki';

const data = raw as unknown as WikiData;

export const people: Person[] = data.people;
export const archivedAt = data.generatedAt;

const byId = new Map(people.map((p) => [p.id, p]));
const byName = new Map(people.map((p) => [p.name, p]));

export const getPerson = (id: number | null) => (id === null ? undefined : byId.get(id));
export const getPersonByName = (name: string) => byName.get(name.normalize('NFC').trim());

export const PART_ORDER: Part[] = ['plan', 'design', 'pd', 'frontend', 'backend', 'unknown'];

export const PART_LABEL: Record<Part, string> = {
  plan: '기획',
  design: '디자인',
  pd: '기획·디자인',
  frontend: '프론트엔드',
  backend: '백엔드',
  unknown: '',
};

/** NPC 옷 색 = 파트 */
export const PART_COLOR: Record<Part, string> = {
  plan: '#ff7b54',
  design: '#b57bff',
  pd: '#ff8fb8',
  frontend: '#3d9bff',
  backend: '#35c46a',
  unknown: '#9aa3ad',
};

/** 마을(기수) 대표색 */
export const GEN_COLOR: Record<number, string> = {
  9: '#8f7dff',
  10: '#39a9f5',
  11: '#ff8a3d',
  12: '#2fbf87',
  13: '#ff5d8f',
  14: '#f2b21d',
};

export const homeOf = (p: Person) => p.home ?? 12;

/** "12기 백엔드" 같은 한 줄 소개. 데이터에 있는 사실만 쓴다 */
export function roleLine(p: Person) {
  return [`${homeOf(p)}기`, PART_LABEL[p.part]].filter(Boolean).join(' ');
}
