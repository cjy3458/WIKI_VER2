import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Jua, Noto_Sans_KR } from 'next/font/google';
import './globals.css';

// 한글 폰트는 글자 범위별 조각이 많아 preload 하지 않는다
const jua = Jua({ weight: '400', variable: '--font-jua', preload: false, display: 'swap' });
const noto = Noto_Sans_KR({ weight: ['400', '700'], variable: '--font-noto', preload: false, display: 'swap' });

export const metadata: Metadata = {
  title: '멋사 중앙대 위키 마을',
  description:
    '멋쟁이사자처럼 중앙대학교 위키 아카이브. 3D 마을을 돌아다니며 동아리 사람들을 만나 그 사람의 위키 글을 읽어 보세요.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#bfe6ff',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className={`${jua.variable} ${noto.variable}`}>
      <body>{children}</body>
    </html>
  );
}
