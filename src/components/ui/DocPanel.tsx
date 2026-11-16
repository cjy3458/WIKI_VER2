'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { WikiContent } from '@/components/ui/WikiContent';
import { PART_COLOR, getPerson, roleLine } from '@/lib/people';
import { player, useGame } from '@/lib/store';
import { getNpc } from '@/lib/village';

const dateFormat = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'long', timeZone: 'Asia/Seoul' });

/** 주민에게 말을 걸면 열리는 글 */
export function DocPanel() {
  const person = useGame((s) => getPerson(s.openId));
  const close = useGame((s) => s.close);
  const guideTo = useGame((s) => s.guideTo);
  const scroller = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
    closeButton.current?.focus({ preventScroll: true });
  }, [person?.id]);

  if (!person) return null;

  const npc = getNpc(person.id);
  const isFar = npc ? Math.hypot(npc.x - player.x, npc.z - player.z) > 8 : false;
  // 인사말은 고정 문구. 글 내용은 지어내지 않는다
  const greeting = person.isEmpty
    ? `안녕! 나는 ${roleLine(person)} ${person.name}. 아직 내 문서에는 아무것도 적혀 있지 않아.`
    : `안녕! 나는 ${roleLine(person)} ${person.name}. 사람들이 나에 대해 이렇게 적어 놨어.`;

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink/45 p-0 sm:items-center sm:p-6"
      onClick={close}
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`${person.name}의 글`}
        className="panel flex max-h-[92dvh] w-full max-w-3xl flex-col rounded-b-none sm:max-h-[88dvh] sm:rounded-b-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start gap-3 border-b-[3px] border-ink p-4 sm:gap-4 sm:p-5">
          <div
            className="grid size-16 shrink-0 place-items-center rounded-2xl border-[3px] border-ink sm:size-20"
            style={{ backgroundColor: PART_COLOR[person.part] }}
          >
            <Image src="/img/lion.png" alt="" width={44} height={56} className="pixelated h-12 w-auto sm:h-14" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h2 className="font-display text-2xl leading-none sm:text-3xl">{person.name}</h2>
              <span className="chip">{roleLine(person)}</span>
              {person.staffOf.map((gen) => (
                <span key={gen} className="chip bg-lion">
                  {gen}기 운영진
                </span>
              ))}
            </div>
            <p className="bubble mt-2">{greeting}</p>
          </div>
          <button ref={closeButton} type="button" className="btn shrink-0 px-3 py-1.5" onClick={close} aria-label="닫기">
            ✕
          </button>
        </header>

        <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-7">
          {person.isEmpty ? (
            <p className="py-10 text-center text-ink/60">
              제목만 있고 내용이 없는 문서예요.
              <br />
              위키가 닫히기 전까지 아무도 이 글을 채우지 않았어요.
            </p>
          ) : (
            <WikiContent content={person.content} />
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t-[3px] border-ink px-4 py-3 text-sm sm:px-5">
          <p className="text-ink/70">
            마지막 수정 {dateFormat.format(new Date(person.updatedAt))} · 태그 {person.tags.join(' ')}
          </p>
          <div className="flex gap-2">
            {isFar && (
              <button type="button" className="btn bg-lion px-3 py-1.5" onClick={() => guideTo(person.id)}>
                찾아가기
              </button>
            )}
            <button type="button" className="btn px-3 py-1.5" onClick={close}>
              닫기 <kbd className="hidden sm:inline">Esc</kbd>
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
