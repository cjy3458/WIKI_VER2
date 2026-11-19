import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Noto_Sans_KR } from 'next/font/google';
import localFont from 'next/font/local';
import './globals.css';

// 한글 폰트는 글자 범위별 조각이 많아 preload 하지 않는다
// 구버전 위키의 픽셀 글꼴(둥근모, OFL). 저장소에 넣어 직접 서빙한다
const pixel = localFont({ src: './fonts/NeoDunggeunmoPro-Regular.woff2', variable: '--font-pixel', display: 'swap' });
const noto = Noto_Sans_KR({ weight: ['400', '500'], variable: '--font-noto', preload: false, display: 'swap' });

export const metadata: Metadata = {
  title: 'CAU LIKE_LION WIKI — 픽셀 마을',
  description:
    '멋쟁이사자처럼 중앙대학교 위키 아카이브. 3D 마을을 돌아다니며 동아리 사람들을 만나 그 사람의 위키 글을 읽어 보세요.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#4c4df5',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className={`${pixel.variable} ${noto.variable}`}>
      <body>{children}</body>
    </html>
  );
}
