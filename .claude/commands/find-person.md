---
description: 아카이브에 특정 사람이 들어 있는지, 어디에 배치되는지 확인
argument-hint: <이름>
allowed-tools: Read, Grep, Bash(node *)
---

`src/data/generated/people.json`에서 "$ARGUMENTS" 를 찾아줘.

- 있으면: id, 기수 태그, 소속 기수/파트, 본문 길이, 비어 있는 문서인지, 그리고 `src/lib/village.ts` 기준으로 서 있는 좌표(x, z).
- 없으면: 왜 빠졌는지 추정해줘 (11·12기 태그 없음 / 소속이 11·12기가 아님 / 사람 명단에 없음 / 제외 목록). 원본을 확인해야 하면 `build-data` 스킬 절차를 따르고, 계정 관련 CSV는 열지 마.

본문 내용 자체는 요약하거나 평가하지 말고 사실만 알려줘.
