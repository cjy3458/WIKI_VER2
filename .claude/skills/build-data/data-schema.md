# people.json 스키마

`src/data/generated/people.json` — `src/types/wiki.ts`의 `WikiData`와 일치해야 한다.

```ts
interface WikiData {
  generatedAt: string;        // 원본 DB에서 가장 최근 문서 수정 시각 (빌드 시각 아님 → 재실행해도 동일)
  people: Person[];           // id 오름차순
}

interface Person {
  id: number;                 // documents_currdoc.id
  name: string;               // 문서 제목 = 사람 이름 (NFC 정규화)
  tags: string[];             // 최신 버전에 붙은 기수 태그 = 활동한 기수들, 예: ["11기", "12기"] (오름차순)
  home: number | null;        // 마을 배치용 소속 기수 (명단 표에서 "아기사자"로 처음 등장한 기수)
  part: Part;                 // 'plan' | 'design' | 'pd'(기획·디자인) | 'frontend' | 'backend' | 'unknown'
  staffOf: number[];          // 운영진으로 활동한 기수들
  updatedAt: string;          // 최신 본문 수정 시각 (ISO) — historydoc.updated_at 기준
  content: string;            // 마크다운+HTML 본문 (링크/이미지 경로만 변환됨)
  isEmpty: boolean;           // 제목 줄만 있고 실제 내용이 없는 문서
}
```

## 본문 안의 변환된 경로

| 원본 | 변환 후 |
|---|---|
| `https://wiki.cau-likelion.org/viewer?title=%EA%B9%80…` | `#wiki/%EA%B9%80…` (NFC 정규화 후 다시 인코딩한 제목) |
| `https://likelionwiki-bucket.s3…/<uuid>.png` | `/wiki-images/<uuid>.webp` (가로 최대 1280px로 줄여 webp 변환) |

`#wiki/` 링크의 대상이 `people`에 있으면 뷰어에서 그 사람 글로 이동하는 링크가 되고, 없으면 일반 텍스트로 표시된다.
