#!/usr/bin/env node
// 원본 위키 DB(CSV 덤프) → src/data/generated/people.json + public/wiki-images/
//
//   npm run build:data -- "<원본 DB가 들어 있는 폴더(상위 폴더도 가능)>"
//
// 규칙은 .claude/rules/data-pipeline.md 참고. 계정/토큰 CSV는 읽지 않는다.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_JSON = path.join(ROOT, 'src/data/generated/people.json');
const OUT_IMG = path.join(ROOT, 'public/wiki-images');

/** 아카이브 대상 기수 태그 */
const TARGET_TAGS = ['11기', '12기'];
/** 아카이브 대상 소속 기수. 11기 운영진으로 태그만 붙은 9·10기는 넣지 않는다 */
const TARGET_HOMES = [11, 12];
/** 명단 표에는 없지만 사람 문서인 것. 값은 본문에 적힌 소속 (예: "12기 아기사자이다") */
const EXTRA_PEOPLE = { 박기황: { gen: 12, part: 'unknown', role: 'member' } };
/** 삭제 요청 등으로 빼야 하는 문서 제목 */
const EXCLUDE_TITLES = [];
/** 명단을 읽을 기수 문서 */
const ROSTER_GENERATIONS = [9, 10, 11, 12, 13, 14];
const IMAGE_MAX_WIDTH = 1280;

// ───────────────────────── CSV ─────────────────────────

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (ch !== '\r') cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const header = rows.shift();
  return rows
    .filter((r) => r.length === header.length)
    .map((r) => Object.fromEntries(header.map((key, i) => [key, r[i]])));
}

function findDbDir(start, depth = 0) {
  if (existsSync(path.join(start, 'documents_currdoc.csv'))) return start;
  if (depth >= 3) return null;
  for (const name of readdirSync(start)) {
    if (name === 'node_modules' || name === '__MACOSX' || name.startsWith('.')) continue;
    const child = path.join(start, name);
    let isDir = false;
    try {
      isDir = statSync(child).isDirectory();
    } catch {
      continue;
    }
    if (!isDir) continue;
    const found = findDbDir(child, depth + 1);
    if (found) return found;
  }
  return null;
}

const norm = (s) => s.normalize('NFC').trim();
const toIso = (s) => new Date(s.replace(' ', 'T') + 'Z').toISOString();

// ───────────────────────── 명단 ─────────────────────────

const WIKI_LINK = /https?:\/\/(?:wiki\.cau-likelion\.org|kiwi-client\.vercel\.app)\/viewer\?title=([^)\s"'<>]+)/g;

function decodeTitle(encoded) {
  try {
    return norm(decodeURIComponent(encoded));
  } catch {
    return norm(encoded);
  }
}

function partOf(headerCell) {
  const h = headerCell.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  if (/기디|기획\s*[&·]?\s*디자인/.test(h)) return 'pd';
  if (/기획/.test(h)) return 'plan';
  if (/디자인/.test(h)) return 'design';
  if (/프론트/.test(h)) return 'frontend';
  if (/백엔드/.test(h)) return 'backend';
  return 'unknown';
}

/** 기수 문서의 "# 인물" 구역에서 { 이름, 파트, 역할 } 목록을 뽑는다 */
function readRoster(content) {
  const entries = [];
  let inPeople = false;
  let role = 'member';
  let columns = null;
  for (const line of content.split('\n')) {
    const heading = line.match(/^#{1,2}\s*(.+)$/);
    if (heading) {
      inPeople = /인물/.test(heading[1]);
      columns = null;
      continue;
    }
    if (!inPeople) continue;
    const isRow = line.trim().startsWith('|');
    if (!isRow) {
      if (/운영진/.test(line)) role = 'staff';
      else if (/아기사자/.test(line)) role = 'member';
      if (line.trim()) columns = null;
      continue;
    }
    const cells = line.trim().replace(/^\|/, '').split('|');
    if (cells.every((c) => /^[\s:-]*$/.test(c))) continue; // 구분선
    if (!columns) {
      columns = cells.map(partOf);
      continue;
    }
    cells.forEach((cell, i) => {
      for (const m of cell.matchAll(WIKI_LINK)) {
        entries.push({ name: decodeTitle(m[1]), part: columns[i] ?? 'unknown', role });
      }
    });
  }
  return entries;
}

// ───────────────────────── 본문 변환 ─────────────────────────

// 위키 S3 버킷 이미지 + <img src="http…"> 로 걸린 외부 이미지. 둘 다 내려받아 보관한다
const S3_IMAGE = /https?:\/\/likelionwiki-bucket\.s3[^\s)"'<>]+|(?<=<img\b[^>]*\bsrc=")https?:\/\/[^"]+/g;

/**
 * 마지막 수정본이 태그 중간에서 잘린 채 저장된 문서가 있다(원본 DB 자체가 그렇다).
 * 같은 문서의 이전 버전에 그 태그가 온전히 있으면 잘린 꼬리만 이어 붙인다. 내용을 지어내지 않는다.
 */
function restoreTruncatedTail(content, olderVersions) {
  const open = content.match(/<[a-zA-Z][^>]*$/);
  if (!open) return { content, restored: false };
  for (const older of olderVersions) {
    const at = older.lastIndexOf(open[0]);
    if (at < 0) continue;
    const end = older.indexOf('>', at);
    if (end < 0) continue;
    return { content: content + older.slice(at + open[0].length, end + 1), restored: true };
  }
  return { content, restored: false };
}

function rewriteLinks(content) {
  return content.replace(WIKI_LINK, (_, encoded) => `#wiki/${encodeURIComponent(decodeTitle(encoded))}`);
}

function isEmptyDoc(content) {
  return (
    content
      .split('\n')
      .filter((line) => !/^\s*#{1,6}\s/.test(line) && !/^\s*#{1,6}$/.test(line))
      .join('')
      .trim() === ''
  );
}

async function fetchImage(url) {
  // 위키 버킷 파일은 이름이 UUID 라 그대로 쓰고, 외부 이미지는 URL 해시로 이름을 만든다
  const id = url.includes('likelionwiki-bucket')
    ? path.basename(new URL(url).pathname).replace(/\.[a-z0-9]+$/i, '')
    : `ext-${createHash('sha1').update(url).digest('hex').slice(0, 16)}`;
  const fileName = `${id}.webp`;
  const dest = path.join(OUT_IMG, fileName);
  if (existsSync(dest)) return { url, local: `/wiki-images/${fileName}`, cached: true };
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const input = Buffer.from(await res.arrayBuffer());
  const output = await sharp(input, { animated: true })
    .rotate()
    .resize({ width: IMAGE_MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer();
  writeFileSync(dest, output);
  return { url, local: `/wiki-images/${fileName}`, cached: false };
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i]);
      }
    }),
  );
  return results;
}

// ───────────────────────── main ─────────────────────────

async function main() {
  const arg = process.argv[2] ?? process.env.WIKI_DB_DIR;
  if (!arg) {
    console.error('사용법: npm run build:data -- "<원본 DB 폴더>"');
    process.exit(1);
  }
  const dbDir = findDbDir(path.resolve(arg));
  if (!dbDir) {
    console.error(`documents_currdoc.csv 를 찾지 못했습니다: ${arg}`);
    process.exit(1);
  }
  const load = (name) => parseCsv(readFileSync(path.join(dbDir, `${name}.csv`), 'utf8').replace(/^﻿/, ''));
  const currDocs = load('documents_currdoc');
  const history = new Map(load('documents_historydoc').map((h) => [h.id, h]));
  // 주의: documents_generation.title_id 는 문서(currdoc)가 아니라 수정 이력(historydoc)의 id 다.
  // 태그는 버전마다 붙으므로, 문서의 현재 태그 = 최신 버전(history_doc_id)에 붙은 태그.
  const tagsByVersion = new Map();
  for (const g of load('documents_generation')) {
    if (!tagsByVersion.has(g.title_id)) tagsByVersion.set(g.title_id, new Set());
    tagsByVersion.get(g.title_id).add(norm(g.generation));
  }

  const docByTitle = new Map(currDocs.map((d) => [norm(d.title), d]));
  const versionsByTitle = new Map();
  for (const h of history.values()) {
    const key = norm(h.title);
    if (!versionsByTitle.has(key)) versionsByTitle.set(key, []);
    versionsByTitle.get(key).push(h);
  }
  const restoredDocs = [];
  const bodyCache = new Map();
  const bodyOf = (doc) => {
    if (bodyCache.has(doc.id)) return bodyCache.get(doc.id);
    const raw = history.get(doc.history_doc_id)?.content ?? '';
    const older = (versionsByTitle.get(norm(doc.title)) ?? [])
      .filter((h) => Number(h.id) < Number(doc.history_doc_id))
      .sort((a, b) => Number(b.id) - Number(a.id))
      .map((h) => h.content);
    const { content, restored } = restoreTruncatedTail(raw, older);
    if (restored) restoredDocs.push(norm(doc.title));
    bodyCache.set(doc.id, content);
    return content;
  };
  const warnings = [];

  // 1) 명단: 이름 → [{ gen, part, role }]
  const roster = new Map();
  for (const gen of ROSTER_GENERATIONS) {
    const doc = docByTitle.get(`${gen}기`);
    if (!doc) continue;
    for (const entry of readRoster(bodyOf(doc))) {
      if (!roster.has(entry.name)) roster.set(entry.name, []);
      roster.get(entry.name).push({ gen, part: entry.part, role: entry.role });
    }
  }
  for (const [name, appearance] of Object.entries(EXTRA_PEOPLE)) {
    if (!roster.has(name)) roster.set(name, [appearance]);
  }

  // 2) 선별: 사람 + 11/12기 태그
  const selected = [];
  for (const [name, appearances] of roster) {
    if (EXCLUDE_TITLES.includes(name)) continue;
    const doc = docByTitle.get(name);
    if (!doc) {
      warnings.push(`명단에 있지만 문서가 없음: ${name}`);
      continue;
    }
    const tags = [...(tagsByVersion.get(doc.history_doc_id) ?? [])];
    if (!tags.some((t) => TARGET_TAGS.includes(t))) continue;
    // 인물 표에서 11기 또는 12기 아기사자로 올라 있는 사람만
    if (!appearances.some((a) => a.role === 'member' && TARGET_HOMES.includes(a.gen))) continue;
    selected.push({ doc, name, tags, appearances });
  }
  selected.sort((a, b) => Number(a.doc.id) - Number(b.doc.id));

  // 3) 이미지
  mkdirSync(OUT_IMG, { recursive: true });
  const imageUrls = [...new Set(selected.flatMap((s) => bodyOf(s.doc).match(S3_IMAGE) ?? []))].sort();
  const imageMap = new Map();
  let downloaded = 0;
  await mapLimit(imageUrls, 6, async (url) => {
    try {
      const result = await fetchImage(url);
      imageMap.set(url, result.local);
      if (!result.cached) downloaded++;
    } catch (error) {
      warnings.push(`이미지 내려받기 실패(원본 URL 유지): ${url} — ${error.message}`);
    }
  });

  // 더 이상 어떤 글에서도 쓰지 않는 이미지는 지운다
  const inUse = new Set([...imageMap.values()].map((local) => path.basename(local)));
  let pruned = 0;
  for (const file of readdirSync(OUT_IMG)) {
    if (!inUse.has(file)) {
      rmSync(path.join(OUT_IMG, file));
      pruned++;
    }
  }

  // 4) 출력
  const genNumber = (tag) => Number.parseInt(tag, 10);
  const people = selected.map(({ doc, name, tags, appearances }) => {
    const memberOf = appearances.filter((a) => a.role === 'member').sort((a, b) => a.gen - b.gen);
    const staffOf = appearances.filter((a) => a.role === 'staff').sort((a, b) => a.gen - b.gen);
    const first = memberOf.find((a) => TARGET_HOMES.includes(a.gen));
    const home = memberOf.find((a) => TARGET_HOMES.includes(a.gen))?.gen ?? null;
    const content = rewriteLinks(bodyOf(doc)).replace(S3_IMAGE, (url) => imageMap.get(url) ?? url);
    return {
      id: Number(doc.id),
      name,
      tags: tags.sort((a, b) => genNumber(a) - genNumber(b)),
      home,
      part: first?.part ?? 'unknown',
      staffOf: [...new Set(staffOf.map((a) => a.gen))],
      // currdoc.updated_at 은 문서 생성 시각에 가깝다. 실제 마지막 수정은 이력 쪽에 있다
      updatedAt: toIso(history.get(doc.history_doc_id)?.updated_at ?? doc.updated_at),
      content,
      isEmpty: isEmptyDoc(content),
    };
  });

  const data = {
    generatedAt: people.map((p) => p.updatedAt).sort().at(-1),
    people,
  };
  mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  writeFileSync(OUT_JSON, JSON.stringify(data, null, 2) + '\n');

  // 5) 요약
  const count = (key) =>
    Object.entries(
      people.reduce((acc, p) => {
        const k = String(key(p));
        acc[k] = (acc[k] ?? 0) + 1;
        return acc;
      }, {}),
    )
      .sort(([a], [b]) => a.localeCompare(b, 'ko', { numeric: true }))
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
  console.log(`전체 문서 ${currDocs.length}개 중 사람 문서 ${people.length}명 선별 (태그: ${TARGET_TAGS.join(', ')} / 소속: ${TARGET_HOMES.map((g) => g + '기').join(', ')})`);
  console.log(`  소속 기수  ${count((p) => (p.home ? `${p.home}기` : '미상'))}`);
  console.log(`  파트       ${count((p) => p.part)}`);
  console.log(`  빈 문서    ${people.filter((p) => p.isEmpty).length}명`);
  console.log(`  이미지     ${imageUrls.length}개 (새로 받음 ${downloaded}, 실패 ${imageUrls.length - imageMap.size}, 정리 ${pruned})`);
  console.log(`  본문 합계  ${people.reduce((n, p) => n + p.content.length, 0).toLocaleString()}자`);
  const restoredPeople = restoredDocs.filter((name) => people.some((p) => p.name === name));
  if (restoredPeople.length) console.log(`  잘린 끝부분을 이전 버전에서 복원: ${restoredPeople.join(', ')}`);
  const unknown = people.filter((p) => p.home === null || p.part === 'unknown').map((p) => p.name);
  if (unknown.length) console.log(`  기수/파트 미상: ${unknown.join(', ')}`);
  for (const w of warnings) console.warn(`  경고: ${w}`);
  console.log(`→ ${path.relative(ROOT, OUT_JSON)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
