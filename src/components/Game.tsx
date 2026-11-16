'use client';

import dynamic from 'next/dynamic';
import { useEffect, useSyncExternalStore } from 'react';
import { CHAT_INPUT_ID } from '@/components/ui/ChatBox';
import { Directory } from '@/components/ui/Directory';
import { DocPanel } from '@/components/ui/DocPanel';
import { Hud } from '@/components/ui/Hud';
import { IntroScreen } from '@/components/ui/IntroScreen';
import { Lightbox } from '@/components/ui/Lightbox';
import { useNet } from '@/lib/net';
import { controls, isBlocked, resetControls, useGame } from '@/lib/store';

const World = dynamic(() => import('@/components/world/World'), {
  ssr: false,
  loading: () => <p className="absolute inset-0 grid place-items-center font-display text-2xl">마을을 짓는 중…</p>,
});

const MOVE_KEYS: Record<string, keyof typeof controls.keys> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ShiftLeft: 'run',
  ShiftRight: 'run',
};

let webglSupport: boolean | null = null;
function hasWebgl() {
  if (webglSupport === null) {
    try {
      const canvas = document.createElement('canvas');
      webglSupport = Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
    } catch {
      webglSupport = false;
    }
  }
  return webglSupport;
}
const subscribeNever = () => () => undefined;

/** 키보드 입력. 한글 입력 상태에서도 되도록 e.key 가 아니라 e.code 로 본다 */
function useKeyboard() {
  useEffect(() => {
    const isTyping = (target: EventTarget | null) =>
      target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

    const onKeyDown = (e: KeyboardEvent) => {
      const game = useGame.getState();
      if (e.code === 'Escape') {
        if (game.zoom !== null) game.setZoom(null);
        else if (game.openId !== null) game.close();
        else if (game.directoryOpen) game.setDirectory(false);
        return;
      }
      if (isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (game.phase === 'intro') return;

      if (e.code === 'Tab') {
        e.preventDefault();
        if (game.openId === null) game.setDirectory(!game.directoryOpen);
        return;
      }
      const move = MOVE_KEYS[e.code];
      if (move) {
        controls.keys[move] = true;
        if (e.code.startsWith('Arrow') && !isBlocked()) e.preventDefault();
        return;
      }
      if (e.code === 'Enter' && !isBlocked()) {
        // Enter → 채팅 입력창으로
        e.preventDefault();
        document.getElementById(CHAT_INPUT_ID)?.focus();
        return;
      }
      if (e.code === 'Space' && !e.repeat && !isBlocked()) {
        if (game.nearbyId !== null) {
          e.preventDefault();
          // 포커스가 남아 있던 버튼이 스페이스바로 같이 눌리지 않게 한다
          if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
          game.open(game.nearbyId);
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const move = MOVE_KEYS[e.code];
      if (move) controls.keys[move] = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', resetControls);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', resetControls);
    };
  }, []);
}

export function Game() {
  const phase = useGame((s) => s.phase);
  const webgl = useSyncExternalStore(subscribeNever, hasWebgl, () => true);
  useKeyboard();

  // 저장해 둔 닉네임·옷 색 불러오기, 마을에 들어가면 다른 접속자와 연결
  useEffect(() => useNet.getState().loadProfile(), []);
  useEffect(() => {
    if (phase === 'play') void useNet.getState().connect();
  }, [phase]);

  return (
    <main className="fixed inset-0 overflow-hidden bg-sky">
      {webgl ? (
        <World />
      ) : (
        <p className="absolute inset-x-0 top-1/3 px-6 text-center">
          이 브라우저에서는 3D 마을을 그릴 수 없어요. 대신 <b>주민 명부</b>에서 글을 읽을 수 있어요.
        </p>
      )}
      {phase === 'intro' ? <IntroScreen canWalk={webgl} /> : <Hud />}
      <Directory />
      <DocPanel />
      <Lightbox />
    </main>
  );
}
