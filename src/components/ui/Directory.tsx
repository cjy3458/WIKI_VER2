'use client';

import { BookOpen, CornerDownLeft, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Portrait, Window } from '@/components/ui/Window';
import { PART_COLOR, PART_LABEL, homeOf, people } from '@/lib/people';
import { useGame } from '@/lib/store';

const sorted = [...people].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
const FILTERS: { tag: string | null; label: string }[] = [
  { tag: null, label: '전체' },
  { tag: '11기', label: '11기' },
  { tag: '12기', label: '12기' },
];
const countOf = (tag: string | null) => (tag ? sorted.filter((p) => p.tags.includes(tag)).length : sorted.length);

/** 주민 도감: 사자 초상 카드를 누르면 그 사람 앞으로 이동한다. 글만 보려면 카드의 "글 보기" */
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

  const typing = query.trim() !== '';
  const go = (id: number) => {
    setQuery('');
    teleportTo(id);
  };

  return (
    <Window
      title="주민도감.exe"
      label="주민 찾기"
      onClose={() => setDirectory(false)}
      className="h-[90dvh] max-w-3xl sm:h-[84dvh]"
    >
      <div className="border-b-[3px] border-ink px-5 pb-4 pt-5 sm:px-6">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="shrink-0 whitespace-nowrap font-display text-2xl leading-none">주민 도감</h2>
          <p className="hidden text-[13px] text-muted sm:block">이름을 입력하고 Enter 를 누르면 그 사람에게 가요</p>
        </div>
        <form
          className="relative mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            // 이름을 치고 Enter 를 누르면 맨 앞 사람에게 바로 간다
            if (results.length > 0) go(results[0].id);
          }}
        >
          <Search size={18} strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <input
            autoFocus
            type="search"
            enterKeyHint="go"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름 입력"
            aria-label="이름으로 찾기"
            className="field h-11 w-full pl-10 pr-3"
          />
        </form>
        <div className="segmented mt-3" role="group" aria-label="기수 태그로 거르기">
          {FILTERS.map((f) => (
            <button key={f.label} type="button" aria-pressed={tag === f.tag} onClick={() => setTag(f.tag)}>
              {f.label}
              <span className="tabular-nums text-muted">{countOf(f.tag)}</span>
            </button>
          ))}
        </div>
      </div>

      <ul className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-3 overflow-y-auto overscroll-contain bg-raised p-4 sm:grid-cols-3 sm:p-6 md:grid-cols-4">
        {results.map((p, i) => {
          const first = typing && i === 0;
          return (
            <li key={p.id} className="card" data-first={first || undefined}>
              <button type="button" className="card-main" onClick={() => go(p.id)} aria-label={`${p.name}에게 이동`}>
                <Portrait color={PART_COLOR[p.part]} size="sm" />
                <span className="mt-3 block truncate font-display text-lg leading-tight">{p.name}</span>
                <span className="mt-1 block truncate text-[13px] text-secondary">
                  {[`${homeOf(p)}기`, PART_LABEL[p.part]].filter(Boolean).join(' ')}
                </span>
                {first && (
                  <span className="mt-2 flex items-center gap-1 text-xs text-brand">
                    <CornerDownLeft size={14} strokeWidth={1.75} aria-hidden />
                    Enter 로 이동
                  </span>
                )}
              </button>
              <button type="button" className="card-read" onClick={() => open(p.id)} aria-label={`${p.name} 글 보기`} title="글 보기">
                <BookOpen size={16} strokeWidth={1.75} aria-hidden />
              </button>
            </li>
          );
        })}
        {results.length === 0 && (
          <li className="col-span-full py-12 text-center text-secondary">
            그런 이름의 주민은 없어요
            <br />
            <span className="text-[13px] text-muted">이 마을에는 11기·12기 사람만 살아요</span>
          </li>
        )}
      </ul>
    </Window>
  );
}
