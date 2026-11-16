---
name: build-data
description: 원본 위키 DB(CSV)에서 아카이브용 JSON과 이미지를 다시 생성한다. 선별 규칙을 바꾸거나, 특정 사람을 추가/제외하거나, 이미지가 깨졌거나, people.json 스키마를 바꿀 때 사용.
---

# 위키 데이터 다시 만들기

## 절차

1. 원본 DB 위치를 확인한다. `CLAUDE.local.md`에 적혀 있다. 폴더 이름이 NFD 한글이라 경로를 직접 치지 말고 상위 폴더를 넘긴다.
2. 바꿀 것이 있으면 `scripts/build-data.mjs`를 수정한다.
   - 사람 추가: `EXTRA_PEOPLE` / 제외: `EXCLUDE_TITLES`
   - 스키마 변경: `src/types/wiki.ts`와 [data-schema.md](data-schema.md)도 같이 고친다.
3. 실행:
   ```bash
   npm run build:data -- "D:/dev/kiwi-client"
   ```
4. 출력 요약을 읽는다. 확인할 것:
   - 사람 수가 예상 범위인가 (기준: 2026-11 현재 58명 — 11기 27, 12기 31)
   - `경고` 줄 — 명단에 있는데 문서가 없는 사람, 이미지 내려받기 실패
   - 소속 기수/파트를 못 찾은 사람(`unknown`) 목록
5. `git diff --stat src/data/generated public/wiki-images`로 변화량이 의도와 맞는지 본다.
6. `npm run build`로 타입이 맞는지 확인한다.

## 하지 말 것

- `src/data/generated/*.json`을 직접 편집 (훅이 막는다)
- 원본 CSV를 이 저장소로 복사
- `users_user.csv` 등 계정 관련 파일 열기 — 필요 없다
