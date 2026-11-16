#!/usr/bin/env node
// PreToolUse(Bash) 훅: 위험하거나 이 프로젝트 규칙에 어긋나는 셸 명령을 막는다.
// 종료 코드 2 + stderr 메시지 → Claude에게 차단 사유가 전달된다.
import { readFileSync } from 'node:fs';

let command = '';
try {
  command = JSON.parse(readFileSync(0, 'utf8'))?.tool_input?.command ?? '';
} catch {
  process.exit(0); // 입력을 못 읽으면 막지 않는다
}

const rules = [
  {
    test: /\bgit\s+push\b[^|;&]*(--force(?!-with-lease)|\s-f\b)/,
    why: 'git push --force 는 금지입니다. 꼭 필요하면 사용자에게 먼저 확인하세요.',
  },
  {
    test: /\bgit\s+add\b[^|;&]*(\.csv|__MACOSX|위키\s*DB)/,
    why: '원본 DB(CSV)는 커밋하지 않습니다. 이메일·비밀번호 해시·토큰이 들어 있습니다. scripts/build-data.mjs 결과(JSON)만 커밋하세요.',
  },
  {
    test: /\bgit\s+add\b[^|;&]*(\.env(?!\.example)|CLAUDE\.local\.md|settings\.local\.json)/,
    why: '로컬 전용 파일(.env, CLAUDE.local.md, settings.local.json)은 커밋 대상이 아닙니다.',
  },
  {
    test: /\brm\s+(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r)[a-zA-Z]*\s+(\/|~|\.\.?)(\s|$)/,
    why: '루트/홈/현재 폴더 전체를 지우는 rm -rf 는 금지입니다.',
  },
  {
    test: /\bgit\s+(reset\s+--hard|clean\s+-[a-zA-Z]*f)/,
    why: '작업 내용을 되돌릴 수 없게 지우는 명령입니다. 사용자에게 먼저 확인하세요.',
  },
  {
    test: /\b(cp|mv|copy|xcopy|robocopy)\b[^|;&]*(users_user|authtoken_token|token_blacklist|django_session|socialaccount)/,
    why: '계정/토큰 관련 CSV는 이 저장소로 옮기지 않습니다.',
  },
];

for (const { test, why } of rules) {
  if (test.test(command)) {
    console.error(`[validate-bash] 차단: ${why}`);
    process.exit(2);
  }
}
process.exit(0);
