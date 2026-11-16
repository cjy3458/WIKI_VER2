---
paths:
  - "scripts/**"
  - "src/data/**"
  - "src/lib/people*.ts"
  - "src/types/**"
---

# 데이터 파이프라인 규칙

원본은 Django DB를 CSV로 덤프한 것이다. 변환은 `scripts/build-data.mjs` 한 곳에서만 한다.

## 원본 테이블 (쓰는 것만)

| 파일 | 내용 |
|---|---|
| `documents_currdoc.csv` | 현재 문서 목록. `history_doc_id`가 최신 본문을 가리킨다 |
| `documents_historydoc.csv` | 모든 수정 이력. 본문(`content`)이 여기 있다. 여러 줄 따옴표 필드라 직접 만든 CSV 파서로 읽는다 |
| `documents_generation.csv` | 기수 태그. **`title_id`는 문서(currdoc)가 아니라 수정 이력(historydoc)의 id다.** 태그는 버전마다 붙는다 |

그 외 CSV(`users_user`, `authtoken_*`, `token_blacklist_*`, `django_session`, `socialaccount_*`)는 **읽지도 않는다.**

## 선별 규칙

1. **태그**: 문서의 최신 버전(`currdoc.history_doc_id`)에 붙은 태그 중 `11기` 또는 `12기`가 있는 문서. `currdoc.id`로 조인하면 엉뚱한 문서의 태그가 붙는다(실제로 한 번 낸 버그).
2. **사람 여부**: 기수 문서(`10기`~`14기`)의 `# 인물` 구역(다음 `#` 제목 전까지)에 링크된 제목이면 사람이다. 단 `N기 기획` 같은 파트 문서는 제외. 명단에 없지만 사람인 문서는 스크립트의 `EXTRA_PEOPLE`에 적는다.
3. 태그는 그 사람이 활동한 기수 전부다(예: 11기 아기사자 + 12기 운영진 → `11기/12기`). 그래서 10기 소속이지만 11기 운영진이라 포함되는 사람이 있다. **선별은 태그로, 마을 배치용 "소속 기수/파트"는 명단 표에서** 뽑는다.

## 본문 변환

- 본문 텍스트는 그대로 둔다. 바꾸는 것은 두 가지뿐:
  - `https://wiki.cau-likelion.org/viewer?title=…`, `kiwi-client.vercel.app/viewer?title=…` → `#wiki/<인코딩된 제목>` 내부 링크
  - S3(`likelionwiki-bucket`) 이미지 URL → `/wiki-images/<uuid>.webp` 로컬 경로
- 이미지는 내려받아 `public/wiki-images/`에 둔다. 내려받기 실패 시 원래 URL을 유지하고 경고를 출력한다.
- 출력은 `src/data/generated/people.json`. 스키마는 `src/types/wiki.ts`와 `.claude/skills/build-data/data-schema.md`를 함께 갱신한다.
- 스크립트는 여러 번 돌려도 같은 결과가 나와야 한다(정렬 고정, 이미 받은 이미지는 건너뜀).
