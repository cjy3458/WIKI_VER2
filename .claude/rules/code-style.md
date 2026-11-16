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
- 스타일은 Tailwind 유틸리티 클래스. 색/폰트 같은 디자인 토큰은 `src/app/globals.css`의 `@theme`에 정의하고 임의 값(`text-[#abc]`)을 흩뿌리지 않는다.
- UI 문구는 한국어. 주석은 "왜"가 필요한 곳에만 한국어로.
- 구버전(`kiwi-client`)의 styled-components, recoil, axios, react-query는 가져오지 않는다. 서버가 없으므로 데이터 패칭 코드 자체가 필요 없다.
- 새 의존성을 추가하기 전에 지금 있는 것으로 되는지 먼저 확인한다.
