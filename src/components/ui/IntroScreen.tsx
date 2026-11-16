'use client';

import Image from 'next/image';
import { AVATAR_COLORS, NAME_MAX, useNet } from '@/lib/net';
import { archivedAt, people } from '@/lib/people';
import { useGame } from '@/lib/store';

const lastEdit = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', timeZone: 'Asia/Seoul' }).format(
  new Date(archivedAt),
);

export function IntroScreen({ canWalk }: { canWalk: boolean }) {
  const enter = useGame((s) => s.enter);
  const setDirectory = useGame((s) => s.setDirectory);
  const profile = useNet((s) => s.profile);
  const setProfile = useNet((s) => s.setProfile);

  return (
    <div className="fixed inset-0 z-30 grid place-items-center overflow-y-auto bg-sky/55 p-4 backdrop-blur-[3px]">
      <section className="panel w-full max-w-lg p-6 text-center sm:p-8">
        <Image
          src="/img/lion.png"
          alt="멋쟁이사자처럼 사자 마스코트"
          width={308}
          height={392}
          priority
          className="pixelated mx-auto h-28 w-auto animate-bob"
        />
        <p className="mt-4 text-sm font-bold tracking-wide text-mane">멋쟁이사자처럼 중앙대학교</p>
        <h1 className="mt-1 font-display text-4xl leading-tight sm:text-5xl">위키 마을</h1>
        <p className="mt-4 text-pretty leading-relaxed text-ink/80">
          서버는 내려갔지만 글은 남았어요.
          <br />
          마을을 돌아다니다 이름표가 붙은 사자를 만나면 말을 걸어 보세요. 그 사람에 대해 우리가 써 둔 위키 글을 보여
          줍니다. 지금 접속해 있는 다른 사람들도 만나서 채팅할 수 있어요.
        </p>

        <dl className="mt-5 grid grid-cols-3 gap-2 text-sm">
          {[
            ['주민', `${people.length}명`],
            ['기수', '11기 · 12기'],
            ['마지막 글', lastEdit],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border-2 border-ink/15 bg-white/70 px-2 py-2">
              <dt className="text-ink/60">{label}</dt>
              <dd className="font-bold">{value}</dd>
            </div>
          ))}
        </dl>

        <fieldset className="mt-5 rounded-2xl border-2 border-ink/15 bg-white/70 p-3 text-left">
          <legend className="px-1 text-sm font-bold">내 캐릭터</legend>
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={profile.name}
              onChange={(e) => setProfile({ name: e.target.value.slice(0, NAME_MAX) })}
              maxLength={NAME_MAX}
              placeholder="닉네임"
              aria-label="닉네임"
              autoComplete="off"
              className="min-w-0 flex-1 rounded-xl border-[3px] border-ink bg-white px-3 py-1.5 outline-none focus:ring-4 focus:ring-brand/30"
            />
            <div className="flex gap-1.5" role="radiogroup" aria-label="옷 색">
              {AVATAR_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  role="radio"
                  aria-checked={profile.color === color}
                  aria-label={`옷 색 ${color}`}
                  onClick={() => setProfile({ color })}
                  className="size-7 rounded-full border-[3px] border-ink aria-checked:ring-4 aria-checked:ring-brand/50"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <p className="mt-2 text-xs text-ink/60">
            다른 접속자와는 서버 없이 브라우저끼리 직접 연결돼요. 채팅은 어디에도 저장되지 않습니다.
          </p>
        </fieldset>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {canWalk && (
            <button type="button" autoFocus className="btn flex-1 bg-brand px-5 py-3 text-lg text-white" onClick={enter}>
              마을 들어가기
            </button>
          )}
          <button
            type="button"
            className="btn flex-1 px-5 py-3 text-lg"
            onClick={() => {
              enter();
              setDirectory(true);
            }}
          >
            이름으로 바로 찾기
          </button>
        </div>

        <p className="mt-5 text-sm text-ink/60">
          <span className="pointer-coarse:hidden">
<kbd>←</kbd>
            <kbd>↑</kbd>
            <kbd>↓</kbd>
            <kbd>→</kbd> 이동 · <kbd>Space</kbd> 말 걸기 · <kbd>Enter</kbd> 채팅 · 마우스 드래그로 둘러보기
          </span>
          <span className="hidden pointer-coarse:inline">왼쪽 아래 조이스틱으로 이동 · 화면을 밀어 둘러보기</span>
        </p>
        <p className="mt-2 text-xs text-ink/50">11기·12기 사람들의 문서만 보존한 읽기 전용 아카이브입니다.</p>
      </section>
    </div>
  );
}
