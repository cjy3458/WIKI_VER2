'use client';

import { useEffect, useMemo, useRef } from 'react';
import { WikiContent } from '@/components/ui/WikiContent';
import { Portrait, Window } from '@/components/ui/Window';
import { PART_COLOR, PART_LABEL, getPerson, homeOf } from '@/lib/people';
import { player, useGame } from '@/lib/store';
import { getNpc } from '@/lib/village';

const dateFormat = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'long', timeZone: 'Asia/Seoul' });

/** 본문의 큰 제목(#, ##)들. 구버전 뷰어의 "목차" 자리에 쓴다 */
function headingsOf(markdown: string) {
  const found: string[] = [];
  let fenced = false;
  // 원본 DB 글은 줄바꿈이 \r\n 인 경우가 있다
  for (const line of markdown.split(/\r?\n/)) {
    if (/^\s*```/.test(line)) fenced = !fenced;
    if (fenced) continue;
    const m = line.match(/^ {0,3}#{1,2}[ \t]+(.+?)[ \t#]*$/);
    if (m) found.push(m[1].replace(/[*_~`]/g, '').trim());
  }
  return found.filter(Boolean);
}

/** 주민에게 말을 걸면 열리는 글. 게임의 캐릭터 정보 창 + 대화창 */
export function DocPanel() {
  const person = useGame((s) => getPerson(s.openId));
  const close = useGame((s) => s.close);
  const teleportTo = useGame((s) => s.teleportTo);
  const scroller = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const headings = useMemo(() => (person && !person.isEmpty ? headingsOf(person.content) : []), [person]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
    closeButton.current?.focus({ preventScroll: true });
  }, [person?.id]);

  if (!person) return null;

  const npc = getNpc(person.id);
  const isFar = npc ? Math.hypot(npc.x - player.x, npc.z - player.z) > 8 : false;
  // 대사는 고정 문구. 글 내용은 지어내지 않는다
  const line = person.isEmpty ? '아직 내 문서에는 아무것도 적혀 있지 않아' : '사람들이 나에 대해 이렇게 적어 놨어';
  const stats = [
    ['기수', `${homeOf(person)}기`],
    ['파트', PART_LABEL[person.part] || '모름'],
    ...(person.staffOf.length ? [['운영진', person.staffOf.map((g) => `${g}기`).join(' ')]] : []),
  ];

  const jumpTo = (index: number) => {
    const target = scroller.current?.querySelectorAll<HTMLElement>('.wiki h1, .wiki h2')[index];
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Window
      title={`${person.name}.wiki`}
      label={`${person.name}의 글`}
      onClose={close}
      closeRef={closeButton}
      className="max-h-[94dvh] max-w-3xl sm:max-h-[88dvh]"
    >
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {/* 캐릭터 정보 */}
        <div className="flex items-center gap-4 px-5 pb-4 pt-5 sm:gap-5 sm:px-8 sm:pt-7">
          <Portrait color={PART_COLOR[person.part]} size="lg" />
          <div className="min-w-0">
            <h2 className="font-display text-[28px] leading-none sm:text-[36px]">{person.name}</h2>
            <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
              {stats.map(([label, value]) => (
                <div key={label} className="flex items-baseline gap-2">
                  <dt className="text-xs text-muted">{label}</dt>
                  <dd className="text-sm font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* 대화창 */}
        <div className="px-5 sm:px-8">
          <p className="dialog">
            <span className="dialog-name">{person.name}</span>
            {line}
            <span className="dialog-more" aria-hidden>
              ▼
            </span>
          </p>
        </div>

        {headings.length >= 3 && (
          <nav aria-label="목차" className="mt-5 px-5 sm:px-8">
            <ol className="flex flex-wrap gap-2">
              {headings.map((heading, i) => (
                <li key={`${i}-${heading}`}>
                  <button type="button" className="toc" onClick={() => jumpTo(i)}>
                    <span className="text-brand">{i + 1}</span>
                    {heading}
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div className="px-5 pb-8 pt-6 sm:px-8">
          {person.isEmpty ? (
            <p className="py-10 text-center text-secondary">
              제목만 있고 내용이 없는 문서예요
              <br />
              위키가 닫히기 전까지 아무도 이 글을 채우지 않았어요
            </p>
          ) : (
            <WikiContent content={person.content} />
          )}
        </div>
      </div>

      <footer className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-t-[3px] border-ink px-5 py-2 sm:px-8">
        <p className="min-w-0 truncate text-[13px] text-secondary">
          태그 {person.tags.join(' ')}
          <span className="mx-2 text-muted">·</span>
          {dateFormat.format(new Date(person.updatedAt))} 수정
        </p>
        {isFar && (
          <button type="button" className="btn btn-primary h-10 shrink-0 px-4" onClick={() => teleportTo(person.id)}>
            이 사람에게 이동
          </button>
        )}
      </footer>
    </Window>
  );
}
