'use client';

import { X } from 'lucide-react';
import type { ReactNode, Ref } from 'react';

/**
 * 구버전 위키 그림의 창. 제목줄에 네모 두 개(시그니처)와 제목, 오른쪽 끝에 닫기.
 * 마을 위에 뜨는 모든 창(글, 주민 도감)이 이 모양을 쓴다.
 */
export function Window({
  title,
  label,
  onClose,
  closeRef,
  className = '',
  children,
}: {
  /** 제목줄에 쓰는 파일 이름 같은 제목, 예: 권민혁.wiki */
  title: string;
  /** 화면 낭독기용 창 이름 */
  label: string;
  onClose: () => void;
  closeRef?: Ref<HTMLButtonElement>;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink/50 sm:items-center sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`window flex w-full flex-col ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="window-bar shrink-0">
          <span className="window-dots" aria-hidden />
          <span className="min-w-0 flex-1 truncate">{title}</span>
          <button ref={closeRef} type="button" className="window-close" onClick={onClose} aria-label="닫기" title="닫기 (Esc)">
            <X size={16} strokeWidth={2.5} aria-hidden />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

/** 사자 초상: 파트 색 바탕에 픽셀 사자 */
export function Portrait({ color, size }: { color: string; size: 'sm' | 'lg' }) {
  return (
    <span className={`portrait portrait-${size}`} style={{ backgroundColor: color }} aria-hidden>
      {/* 픽셀 그림을 그대로 키운다 (next/image 최적화가 오히려 뭉갠다) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/img/lion.png" alt="" className="pixelated" />
    </span>
  );
}
