# WIKI_VER2 — 멋쟁이사자처럼 중앙대 위키 아카이브

@AGENTS.md

## 프로젝트 개요

서버가 내려간 멋사 중앙대 위키(`wiki.cau-likelion.org`, 구 `kiwi-client`)를 **읽기 전용 아카이브**로 되살리는 프로젝트.

- 백엔드 없음. Next.js 하나로 끝낸다. 위키 글은 빌드 전에 JSON으로 변환해 저장소에 넣는다.
- 검색/클릭으로 글을 찾던 방식 대신, **3D 마을을 캐릭터로 돌아다니며 이름표가 붙은 동아리 사람(NPC)에게 말을 걸면 그 사람의 글이 열리는** 방식이다.
- 대상은 **11기·12기 사람 문서만**: 원본 DB에서 "11기" 또는 "12기" 태그가 붙어 있고, 인물 표에 11기 또는 12기 아기사자로 올라 있는 사람. 프로젝트/소모임/기수 문서, 9·10·13·14기 사람은 넣지 않는다.
- 마을은 기수별로 나누지 않는다(두 태그를 다 가진 사람이 많다). 주민은 한 마을에 흩어져 있고, 이름으로 찾아 그 사람 앞으로 바로 이동할 수 있다.
- 편집·로그인·역사·역링크 기능은 없다. 만들지 않는다.

## 기술 스택

- Next.js 16 (App Router, `src/` 디렉터리) + React 19 + TypeScript
- 3D: `three`, `@react-three/fiber`, `@react-three/drei` — 물리엔진 없이 자체 충돌 처리
- 상태: `zustand` / 스타일: Tailwind CSS v4
- 본문 렌더링: `react-markdown` + `remark-gfm` + `rehype-raw` + `rehype-sanitize`
- 패키지 매니저: npm

## 명령어

| 명령 | 용도 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 (타입 체크 포함) |
| `npm run lint` | ESLint |
| `npm run build:data -- "<원본 DB 폴더>"` | CSV → `src/data/generated/*.json` 재생성 + 이미지 내려받기 |

## 폴더 구조

```
scripts/build-data.mjs      원본 CSV → JSON 변환기 (유일한 데이터 생성 경로)
src/data/generated/         변환 결과 JSON (커밋함, 손으로 고치지 않음)
public/wiki-images/         본문 이미지 로컬 사본 (커밋함)
src/app/                    라우트
src/components/world/       3D 씬 (맵, 플레이어, NPC, 카메라)
src/components/ui/          HUD, 대화창, 문서 뷰어, 주민 명부
src/lib/                    스토어, 마을 배치 계산, 유틸
docs/design.md              설계 문서
```

## 반드시 지킬 것

1. **원본 DB는 절대 이 저장소에 넣지 않는다.** `users_user.csv`에는 이메일·비밀번호 해시, 다른 CSV에는 토큰이 들어 있다. 커밋되는 것은 `scripts/build-data.mjs`가 만든 문서 JSON뿐이다. 원본 위치는 `CLAUDE.local.md` 참고.
2. **`src/data/generated/`는 직접 수정하지 않는다.** 바꿀 게 있으면 스크립트를 고치고 다시 생성한다.
3. **글 내용은 원문 그대로 보존한다.** 아카이브다. 오탈자 수정, 요약, 문장 다듬기 금지. 바꿔도 되는 것은 링크/이미지 경로뿐이다.
4. 3D 관련 컴포넌트는 전부 클라이언트 컴포넌트이고, `<Canvas>`는 `next/dynamic`의 `ssr: false`로만 불러온다.
5. 커밋 메시지는 기존 저장소 관례대로 한국어 + `feat:` / `fix:` / `chore:` 접두어.

세부 규칙은 `.claude/rules/`에, 반복 작업 절차는 `.claude/skills/`에 있다.
