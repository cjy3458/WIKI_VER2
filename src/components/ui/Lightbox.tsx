'use client';

import { useEffect, useRef } from 'react';
import { useGame } from '@/lib/store';

/** 글 속 이미지를 누르면 화면 가득 크게 보여 준다 */
export function Lightbox() {
  const zoom = useGame((s) => s.zoom);
  const setZoom = useGame((s) => s.setZoom);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (zoom) closeButton.current?.focus({ preventScroll: true });
  }, [zoom]);

  if (!zoom) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="이미지 크게 보기"
      className="fixed inset-0 z-50 grid cursor-zoom-out place-items-center bg-ink/90 p-3 sm:p-8"
      onClick={() => setZoom(null)}
    >
      {/* 크기를 알 수 없는 사용자 업로드 이미지라 next/image 를 쓰지 않는다 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={zoom.src}
        alt={zoom.alt}
        // 원본이 작은 사진도 화면에 맞춰 키운다
        className="h-[calc(100dvh-5rem)] w-full animate-pop object-contain"
      />
      <button
        ref={closeButton}
        type="button"
        className="btn absolute right-3 top-3 px-3 py-1.5 sm:right-6 sm:top-6"
        onClick={() => setZoom(null)}
      >
        닫기 <kbd className="hidden sm:inline">Esc</kbd>
      </button>
    </div>
  );
}
