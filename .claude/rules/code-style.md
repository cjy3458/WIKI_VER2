---
paths:
  - "src/**/*.{ts,tsx}"
  - "scripts/**/*.mjs"
---

# 코드 스타일

- TypeScript strict. `any` 금지 — 모르는 타입은 `unknown`으로 받고 좁힌다.
- import는 `@/` 별칭 사용 (`@/components/...`, `@/lib/...`). 상대 경로는 같은 폴더 안에서만.
- 컴포넌트는 함수 선언 + named export. 파일명은 컴포넌트명과 같은 PascalCase, 그 외는 camelCase.
- 서버 컴포넌트가 기본. `'use client'`는 훅·이벤트·three.js가 필요한 파일에만 붙인다.
- **UI는 구버전 위키 톤** (unslop 스킬로 다듬은 방향, 2026-11 사용자 확정):
  - 창: `Window` 컴포넌트(제목줄의 네모 두 개 + 제목 + 닫기). 떠 있는 작은 창은 `.window` + `.window-bar` + `.window-dots`. 닫기는 제목줄 한 곳에만 둔다.
  - 3px 잉크 테두리, 딱딱한 그림자, 각진 모서리(`rounded-*` 쓰지 않는다).
  - 색: 글자는 `ink`/`secondary`/`muted` 세 단계, 면은 `paper`/`raised`, 구분선은 `line`. **파랑(brand)은 주요 동작(말 걸기·이동)과 선택에만**, 노랑(lion)은 사자 쪽에만. 버튼마다 색을 칠하지 않는다.
  - 글꼴: 제목·이름·버튼은 둥근모(`font-display`), 본문·메타·키캡은 Noto Sans KR 400/500. 700 이상 쓰지 않는다.
  - 문구: 짧은 라벨과 안내에 마침표·느낌표를 붙이지 않는다. 같은 동작은 한 이름으로("이동", "글 보기").
  - 아이콘은 lucide-react 한 세트.
  - 간격은 4px 단위(Tailwind 기본 단위). 임의값(`mt-[13px]`) 대신 단계를 쓴다.
  - UI를 크게 바꿀 때는 `unslop` 스킬 절차(진단 → 방향 확인 → 9단계)를 따른다.
- **첫 화면(`IntroScreen`)에 입력창·모달·설명 문구를 추가하지 않는다.** 구버전 첫 화면 그대로이고, 할 수 있는 일은 창 그림을 누르는 것 하나다(옆에 `CLICK!` 배지). 사용자가 명시한 결정이다.
- 스타일은 Tailwind 유틸리티 클래스. 색/폰트 같은 디자인 토큰은 `src/app/globals.css`의 `@theme`에 정의하고 임의 값(`text-[#abc]`)을 흩뿌리지 않는다.
- UI 문구는 한국어. 주석은 "왜"가 필요한 곳에만 한국어로.
- 구버전(`kiwi-client`)의 styled-components, recoil, axios, react-query는 가져오지 않는다. 서버가 없으므로 데이터 패칭 코드 자체가 필요 없다.
- 새 의존성을 추가하기 전에 지금 있는 것으로 되는지 먼저 확인한다.
