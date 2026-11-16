'use client';

import { useMemo, useState } from 'react';
import { PART_COLOR, people, roleLine } from '@/lib/people';
import { useGame } from '@/lib/store';

const sorted = [...people].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
const TAGS = ['11기', '12기'];

/** 주민 찾기: 이름을 입력하면 그 사람 앞으로 바로 이동하거나 글을 바로 연다 */
export function Directory() {
  const isOpen = useGame((s) => s.directoryOpen);
  const setDirectory = useGame((s) => s.setDirectory);
  const open = useGame((s) => s.open);
  const teleportTo = useGame((s) => s.teleportTo);
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<string | null>(null);

  const results = useMemo(() => {
    const q = query.trim().normalize('NFC');
    return sorted.filter((p) => (tag === null || p.tags.includes(tag)) && (q === '' || p.name.includes(q)));
  }, [query, tag]);

  if (!isOpen) return null;

  const go = (id: number) => {
    setQuery('');
    teleportTo(id);
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink/45 sm:items-center sm:p-6"
      onClick={() => setDirectory(false)}
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="주민 찾기"
        className="panel flex h-[88dvh] w-full max-w-xl flex-col rounded-b-none sm:h-[80dvh] sm:rounded-b-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="border-b-[3px] border-ink p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl">주민 찾기</h2>
            <button type="button" className="btn px-3 py-1.5" onClick={() => setDirectory(false)} aria-label="닫기">
              ✕
            </button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              // 이름을 치고 Enter 를 누르면 맨 위 사람에게 바로 간다
              if (results.length > 0) go(results[0].id);
            }}
          >
            <input
              autoFocus
              type="search"
              enterKeyHint="go"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="이름 입력 후 Enter → 그 사람에게 바로 이동"
              aria-label="이름으로 찾기"
              className="mt-3 w-full rounded-xl border-[3px] border-ink bg-white px-3 py-2 text-base outline-none focus:ring-4 focus:ring-brand/30"
            />
          </form>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <button type="button" className="chip" data-active={tag === null} onClick={() => setTag(null)}>
              전체 {sorted.length}
            </button>
            {TAGS.map((t) => (
              <button key={t} type="button" className="chip" data-active={tag === t} onClick={() => setTag(t)}>
                {t} 태그 {sorted.filter((p) => p.tags.includes(t)).length}
              </button>
            ))}
          </div>
        </header>

        <ul className="min-h-0 flex-1 divide-y-2 divide-ink/10 overflow-y-auto overscroll-contain">
          {results.map((p, i) => (
            <li key={p.id} className="flex items-center gap-3 px-4 py-2.5" data-first={i === 0 && query.trim() !== ''}>
              <i className="size-3 shrink-0 rounded-full border-2 border-ink" style={{ backgroundColor: PART_COLOR[p.part] }} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{p.name}</p>
                <p className="truncate text-sm text-ink/60">
                  {roleLine(p)} · 태그 {p.tags.join(' ')}
                </p>
              </div>
              <button type="button" className="btn px-2.5 py-1 text-sm" onClick={() => open(p.id)}>
                글 보기
              </button>
              <button type="button" className="btn bg-lion px-2.5 py-1 text-sm" onClick={() => go(p.id)}>
                바로 이동
                {i === 0 && query.trim() !== '' && <kbd className="ml-1 hidden sm:inline">Enter</kbd>}
              </button>
            </li>
          ))}
          {results.length === 0 && (
            <li className="px-4 py-10 text-center text-ink/60">
              그런 이름의 주민은 없어요.
              <br />
              이 마을에는 11기·12기 사람만 살아요.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
