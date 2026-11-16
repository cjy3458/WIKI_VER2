---
description: 커밋 전 변경 사항을 이 프로젝트 규칙 기준으로 점검
allowed-tools: Bash(git diff*), Bash(git status*), Read, Grep, Glob
---

현재 변경 사항(`git diff HEAD`, 추적 안 된 파일 포함)을 검토해줘. $ARGUMENTS

다음 순서로 보고, 문제가 있는 것만 `파일:줄` 과 함께 알려줘.

1. **유출**: 원본 CSV, 이메일, 토큰, `.env`, 로컬 전용 파일이 섞여 있지 않은가
2. **원문 보존**: `src/data/generated/`가 스크립트가 아닌 손으로 바뀌지 않았는가
3. **3D 성능**: `useFrame` 안의 setState/객체 생성, 인스턴싱 없이 반복되는 mesh
4. **안전한 렌더링**: sanitize 없이 본문 HTML을 그리는 곳
5. **정확성**: 타입 구멍(`any`, 불필요한 `!`), 정리되지 않는 이벤트 리스너/텍스처/지오메트리

문제가 없으면 없다고만 말해줘. 취향 수준의 지적은 생략.
