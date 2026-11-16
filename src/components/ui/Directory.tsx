'use client';

import { useMemo, useState } from 'react';
import { GEN_COLOR, PART_COLOR, PART_LABEL, homeOf, people } from '@/lib/people';
import { useGame } from '@/lib/store';

const sorted = [...people].sort((a, b) => homeOf(a) - homeOf(b) || a.name.localeCompare(b.name, 'ko'));
const generations = [...new Set(sorted.map(homeOf))];

/** 주민 명부: 걸어 다니지 않고도 이름으로 글을 찾을 수 있다 */
export function Directory() {
  const isOpen = useGame((s) => s.directoryOpen);
  const setDirectory = useGame((s) => s.setDirectory);
  const open = useGame((s) => s.open);
  const guideTo = useGame((s) => s.guideTo);
  const [query, setQuery] = useState('');
  const [gen, setGen] = useState<number | null>(null);

  const results = useMemo(() => {
    const q = query.trim().normalize('NFC');
    return sorted.filter((p) => (gen === null || homeOf(p) === gen) && (q === '' || p.name.includes(q)));
  }, [query, gen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink/45 sm:items-center sm:p-6"
      onClick={() => setDirectory(false)}
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="주민 명부"
        className="panel flex h-[88dvh] w-full max-w-xl flex-col rounded-b-none sm:h-[80dvh] sm:rounded-b-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="border-b-[3px] border-ink p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl">주민 명부</h2>
            <button type="button" className="btn px-3 py-1.5" onClick={() => setDirectory(false)} aria-label="닫기">
              ✕
            </button>
          </div>
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름으로 찾기"
            aria-label="이름으로 찾기"
            className="mt-3 w-full rounded-xl border-[3px] border-ink bg-white px-3 py-2 text-base outline-none focus:ring-4 focus:ring-brand/30"
          />
          <div className="mt-3 flex flex-wrap gap-1.5">
            <button type="button" className="chip" data-active={gen === null} onClick={() => setGen(null)}>
              전체 {sorted.length}
            </button>
            {generations.map((g) => (
              <button key={g} type="button" className="chip" data-active={gen === g} onClick={() => setGen(g)}>
                <i className="mr-1 inline-block size-2 rounded-full" style={{ backgroundColor: GEN_COLOR[g] }} />
                {g}기
              </button>
            ))}
          </div>
        </header>

        <ul className="min-h-0 flex-1 divide-y-2 divide-ink/10 overflow-y-auto overscroll-contain">
          {results.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
              <i className="size-3 shrink-0 rounded-full border-2 border-ink" style={{ backgroundColor: PART_COLOR[p.part] }} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{p.name}</p>
                <p className="truncate text-sm text-ink/60">
                  {[`${homeOf(p)}기`, PART_LABEL[p.part], p.isEmpty ? '빈 문서' : ''].filter(Boolean).join(' · ')}
                </p>
              </div>
              <button type="button" className="btn px-2.5 py-1 text-sm" onClick={() => guideTo(p.id)}>
                찾아가기
              </button>
              <button type="button" className="btn bg-lion px-2.5 py-1 text-sm" onClick={() => open(p.id)}>
                글 보기
              </button>
            </li>
          ))}
          {results.length === 0 && (
            <li className="px-4 py-10 text-center text-ink/60">
              그런 이름의 주민은 없어요.
              <br />
              이 마을에는 11기·12기 태그가 붙은 사람만 살아요.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
