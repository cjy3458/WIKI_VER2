#!/usr/bin/env node
// PreToolUse(Edit|Write) 훅: 생성된 데이터와 원본 DB를 손으로 고치지 못하게 막는다.
import { readFileSync } from 'node:fs';

let filePath = '';
try {
  filePath = JSON.parse(readFileSync(0, 'utf8'))?.tool_input?.file_path ?? '';
} catch {
  process.exit(0);
}
const p = filePath.replace(/\\/g, '/');

if (/\/src\/data\/generated\//.test(p)) {
  console.error(
    '[protect-generated] src/data/generated/ 는 직접 수정하지 않습니다. scripts/build-data.mjs 를 고친 뒤 `npm run build:data` 로 다시 생성하세요.',
  );
  process.exit(2);
}
if (/\.csv$/i.test(p)) {
  console.error('[protect-generated] CSV(원본 DB)는 수정/생성하지 않습니다. 원본은 읽기 전용입니다.');
  process.exit(2);
}
process.exit(0);
