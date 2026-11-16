'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useGame } from '@/lib/store';

const ZOOM_MS = 950;

/** 구버전 첫 화면처럼 여기저기 떠다니는 하트와 사자 */
const FLOATERS = [
  { src: '/img/heart.png', left: '12%', top: '14%', size: 38, delay: 0 },
  { src: '/img/redlion.png', left: '35%', top: '9%', size: 36, delay: 1.1 },
  { src: '/img/minilion.png', left: '15%', top: '31%', size: 34, delay: 0.5 },
  { src: '/img/heart.png', left: '7%', top: '57%', size: 38, delay: 1.6 },
  { src: '/img/minilion.png', left: '31%', top: '50%', size: 34, delay: 2.2 },
  { src: '/img/crylion.png', left: '17%', top: '89%', size: 34, delay: 0.8 },
  { src: '/img/minilion.png', left: '95%', top: '30%', size: 36, delay: 1.9 },
  { src: '/img/heart.png', left: '93%', top: '62%', size: 38, delay: 0.3 },
  { src: '/img/heart.png', left: '88%', top: '92%', size: 36, delay: 1.3 },
];

/**
 * 구버전 위키의 첫 화면. 창 그림을 누르면 그 창 속으로 빨려 들어가며 바로 마을에 들어선다.
 * 닉네임 같은 설정은 묻지 않는다(들어간 뒤 왼쪽 위 접속자 목록에서 바꿀 수 있다).
 */
export function IntroScreen({ canWalk }: { canWalk: boolean }) {
  const enter = useGame((s) => s.enter);
  const setDirectory = useGame((s) => s.setDirectory);
  const windowRef = useRef<HTMLButtonElement>(null);
  const [zoom, setZoom] = useState<CSSProperties | null>(null);

  const dive = () => {
    if (zoom) return;
    const go = () => {
      enter();
      if (!canWalk) setDirectory(true);
    };
    const el = windowRef.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      go();
      return;
    }
    // 창 그림의 하늘 한가운데를 향해, 하늘이 화면을 다 덮을 때까지 키운다
    const rect = el.getBoundingClientRect();
    const scale = Math.max(window.innerWidth / rect.width, window.innerHeight / rect.height) * 3.2;
    const originX = rect.left + rect.width * 0.45;
    const originY = rect.top + rect.height * 0.4;
    setZoom({
      transformOrigin: `${originX}px ${originY}px`,
      transform: `translate(${window.innerWidth / 2 - originX}px, ${window.innerHeight / 2 - originY}px) scale(${scale})`,
    });
    window.setTimeout(go, ZOOM_MS);
  };

  return (
    <div className="desktop fixed inset-0 z-30 overflow-hidden" data-zooming={zoom ? '' : undefined}>
      <div className="flex h-full flex-col transition-transform ease-in" style={{ transitionDuration: `${ZOOM_MS}ms`, ...zoom }}>
        <header className="landing-fade flex h-16 shrink-0 items-center bg-white px-5 sm:h-20 sm:px-14">
          <Image
            src="/img/logo.png"
            alt="멋쟁이사자처럼 중앙대학교"
            width={382}
            height={96}
            priority
            className="pixelated h-9 w-auto sm:h-11"
          />
        </header>

        <main className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-6 py-6 lg:flex-row lg:justify-evenly lg:gap-[6%] lg:px-[8%]">
          {FLOATERS.map((f, i) => (
            <Image
              key={i}
              src={f.src}
              alt=""
              width={f.size}
              height={f.size}
              className="landing-fade pixelated pointer-events-none absolute hidden animate-float sm:block"
              style={{ left: f.left, top: f.top, width: f.size, height: 'auto', animationDelay: `${f.delay}s` }}
            />
          ))}

          <h1 className="landing-fade w-[38%] max-w-[230px] shrink-0 lg:w-[24%] lg:max-w-[430px]">
            <Image src="/img/landingTitle.png" alt="CAU LIKE_LION WIKI" width={535} height={742} priority className="h-auto w-full" />
          </h1>

          <div className="relative w-[88%] max-w-[760px] lg:w-[48%]">
            <button
              ref={windowRef}
              type="button"
              autoFocus
              onClick={dive}
              aria-label="창 속 픽셀 마을로 들어가기"
              className="landing-window block w-full cursor-pointer"
            >
              <Image src="/img/landingGame.png" alt="" width={1238} height={966} priority className="pixelated h-auto w-full" />
            </button>
            <span className="landing-fade click-badge pointer-events-none absolute -top-5 right-2 sm:-right-6 sm:-top-7" aria-hidden>
              CLICK!
            </span>
          </div>
        </main>
      </div>
      {/* 다 들어가면 화면이 하늘색으로 덮이고, 마을 쪽에서 같은 색이 걷힌다 */}
      <div className="landing-sky pointer-events-none absolute inset-0" style={{ transitionDuration: `${ZOOM_MS}ms` }} />
    </div>
  );
}
