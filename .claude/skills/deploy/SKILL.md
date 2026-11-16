---
name: deploy
description: 변경 사항을 검증하고 GitHub(main)에 올린다. 사용자가 "올려줘", "푸시해줘", "배포해줘"라고 할 때 사용.
disable-model-invocation: true
---

# 올리기 절차

사용자가 직접 `/deploy`로 부를 때만 실행한다. 설정값은 [deploy-config.md](deploy-config.md).

1. **검증** — 하나라도 실패하면 멈추고 보고한다.
   ```bash
   npm run lint
   npm run build
   ```
2. **커밋 대상 점검**
   ```bash
   git status --short
   ```
   아래가 스테이징 대상에 보이면 중단:
   - `*.csv`, `__MACOSX`, 원본 DB 폴더
   - `.env*`, `CLAUDE.local.md`, `.claude/settings.local.json`
3. **커밋** — 파일을 이름으로 지정해 add 한다(`git add -A` 대신). 메시지는 한국어 + `feat:`/`fix:`/`chore:`/`docs:` 접두어.
4. **푸시**
   ```bash
   git push origin main
   ```
   거절되면 `--force`를 쓰지 말고, `git pull --rebase origin main` 후 다시 시도한다. 충돌이 나면 사용자에게 알린다.
5. **보고** — 커밋 해시, 올라간 파일 수, 호스팅 플랫폼이 연결돼 있다면 배포 확인 방법.
