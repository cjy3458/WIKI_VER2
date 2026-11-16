# 배포 설정

| 항목 | 값 |
|---|---|
| 원격 저장소 | `https://github.com/cjy3458/WIKI_VER2.git` |
| 배포 브랜치 | `main` |
| 빌드 명령 | `npm run build` |
| Node | 20 이상 |
| 환경 변수 | 없음 (서버·API 없음) |
| 호스팅 | 미정 — Vercel에 저장소를 연결하면 설정 없이 동작한다 |

## 메모

- 데이터(`src/data/generated/`)와 이미지(`public/wiki-images/`)는 저장소에 들어 있으므로 빌드 시 원본 DB가 필요 없다. 호스팅 환경에서 `build:data`를 돌리지 않는다.
- 정적 호스팅(GitHub Pages 등)으로 옮기려면 `next.config.ts`에 `output: 'export'`를 켜면 된다. 서버 기능을 쓰지 않으므로 그대로 동작해야 한다.
