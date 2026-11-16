---
paths:
  - "src/lib/net.ts"
  - "src/components/world/Visitors.tsx"
  - "src/components/ui/ChatBox.tsx"
---

# 함께 접속(메타버스) 규칙

설계는 `docs/multiplayer.md`.

- **서버를 만들지 않는다.** 실시간 통신은 `trystero`(P2P)로만 한다. API 라우트, 웹소켓 서버, DB를 추가하지 않는다.
- 통신 코드는 `src/lib/net.ts` 밖으로 새지 않는다. 컴포넌트는 `useNet`과 `remotes`만 쓴다. `trystero`는 `net.ts` 안에서 동적 import 한다(SSR에서 불러오지 않는다).
- **받은 데이터는 믿지 않는다.** 타입·길이·범위를 검증한 뒤에만 상태에 넣는다. 채팅과 닉네임은 텍스트로만 그린다 — `dangerouslySetInnerHTML`, 마크다운 렌더링 금지.
- 채팅은 저장하지 않는다(메모리에만, 최근 40개). localStorage에 넣는 것은 내 닉네임·옷 색뿐이다. 숨긴 사람은 이번 접속 동안만 유지한다(상대 id가 접속마다 바뀐다).
- 위치처럼 자주 바뀌는 값은 `remotes` Map에 두고 `useFrame`에서 읽는다. zustand에 넣지 않는다.
- 접속자는 위키 글을 바꿀 수 없다. 아카이브는 읽기 전용이다.
- 연결 실패는 오류가 아니다. 혼자 접속한 상태로 계속 동작해야 한다.
