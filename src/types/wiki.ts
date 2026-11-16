export type Part = 'plan' | 'design' | 'pd' | 'frontend' | 'backend' | 'unknown';

export interface Person {
  /** documents_currdoc.id */
  id: number;
  /** 문서 제목 = 사람 이름 */
  name: string;
  /** DB에 붙어 있던 기수 태그 (실제 소속 기수와 다를 수 있다) */
  tags: string[];
  /** 마을 배치용 소속 기수. 명단 표에서 아기사자로 처음 등장한 기수 */
  home: number | null;
  part: Part;
  /** 운영진으로 활동한 기수 */
  staffOf: number[];
  updatedAt: string;
  /** 마크다운 + HTML 본문. 링크/이미지 경로만 변환돼 있다 */
  content: string;
  /** 제목 줄만 있고 실제 내용이 없는 문서 */
  isEmpty: boolean;
}

export interface WikiData {
  generatedAt: string;
  people: Person[];
}
