'use client';

import { useEffect, useRef } from 'react';
import { ChatBox } from '@/components/ui/ChatBox';
import { remotes, useNet } from '@/lib/net';
import { PART_COLOR, getPerson, people, roleLine } from '@/lib/people';
import { controls, player, useGame } from '@/lib/store';
import { activateSpot } from '@/components/Game';
import { PLAZA_HALF, WORLD_HALF, getSpot, landmarks, village } from '@/lib/village';

const MAP_SIZE = 168;

/** 위가 북쪽인 미니맵. 10fps 로만 다시 그린다 */
function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = canvas.height = MAP_SIZE * ratio;
    const scale = MAP_SIZE / (WORLD_HALF * 2);
    const at = (v: number) => (v + WORLD_HALF) * scale;
    const block = (x: number, z: number, size: number, fill: string) => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(at(x) - size / 2 - 1, at(z) - size / 2 - 1, size + 2, size + 2);
      ctx.fillStyle = fill;
      ctx.fillRect(at(x) - size / 2, at(z) - size / 2, size, size);
    };

    const draw = () => {
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.fillStyle = '#55b532';
      ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);

      ctx.fillStyle = '#ecd9a6';
      for (const r of village.roads) ctx.fillRect(at(r.x - r.w / 2), at(r.z - r.d / 2), r.w * scale, r.d * scale);
      ctx.fillStyle = '#fbf6e6';
      ctx.fillRect(at(-PLAZA_HALF), at(-PLAZA_HALF), PLAZA_HALF * 2 * scale, PLAZA_HALF * 2 * scale);
      const { pond, tower, portal, lounge } = landmarks;
      ctx.fillStyle = '#0aa0e6';
      ctx.fillRect(at(pond.x - pond.half), at(pond.z - pond.half), pond.half * 2 * scale, pond.half * 2 * scale);
      // 건축물: 타워(파랑), 포털(분홍), 모닥불(주황)
      block(tower.x, tower.z, 13, '#4c4df5');
      block(portal.x, portal.z, 9, '#ff5d8f');
      block(lounge.x, lounge.z, 9, '#ff8a1f');

      // 주민: 파트 색 점. 지금 말 걸 수 있는 사람은 크게
      const nearbyId = useGame.getState().nearbyId;
      for (const npc of village.npcs) {
        const size = npc.id === nearbyId ? 7 : 4;
        ctx.fillStyle = '#000000';
        ctx.fillRect(at(npc.x) - size / 2 - 1, at(npc.z) - size / 2 - 1, size + 2, size + 2);
        ctx.fillStyle = PART_COLOR[npc.part];
        ctx.fillRect(at(npc.x) - size / 2, at(npc.z) - size / 2, size, size);
      }

      // 함께 접속한 사람들: 흰 네모
      const { peers, muted } = useNet.getState();
      for (const peer of peers) {
        const remote = remotes.get(peer.id);
        if (!remote || muted.includes(peer.id)) continue;
        block(remote.x, remote.z, 6, '#ffffff');
      }

      // 나: 바라보는 방향의 화살표
      ctx.save();
      ctx.translate(at(player.x), at(player.z));
      ctx.rotate(Math.PI - player.rot);
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(6, 6);
      ctx.lineTo(0, 3);
      ctx.lineTo(-6, 6);
      ctx.closePath();
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };
    draw();
    const timer = window.setInterval(draw, 100);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="size-28 border-[3px] border-ink shadow-[4px_4px_0_var(--color-ink)] sm:size-[168px]"
    />
  );
}

/** 터치 화면용 이동 조이스틱 */
function Joystick() {
  const knob = useRef<HTMLDivElement>(null);

  const update = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const half = rect.width / 2;
    let x = (e.clientX - rect.left - half) / half;
    let y = (e.clientY - rect.top - half) / half;
    const length = Math.hypot(x, y);
    if (length > 1) {
      x /= length;
      y /= length;
    }
    controls.stick.x = x;
    controls.stick.y = -y;
    if (knob.current) knob.current.style.transform = `translate(${x * 34}px, ${y * 34}px)`;
  };
  const release = () => {
    controls.stick.x = controls.stick.y = 0;
    if (knob.current) knob.current.style.transform = '';
  };

  return (
    <div
      className="pointer-events-auto hidden size-32 touch-none place-items-center border-[3px] border-ink bg-paper/80 shadow-[4px_4px_0_var(--color-ink)] pointer-coarse:grid"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) update(e);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      aria-label="이동 조이스틱"
      role="application"
    >
      <div ref={knob} className="size-14 border-[3px] border-ink bg-lion" />
    </div>
  );
}

/** 지금 함께 접속해 있는 사람 수와 목록 */
function Online() {
  const status = useNet((s) => s.status);
  const peers = useNet((s) => s.peers);
  const muted = useNet((s) => s.muted);
  const myName = useNet((s) => s.profile.name);
  const toggleMute = useNet((s) => s.toggleMute);

  const label =
    status === 'failed' ? '연결 안 됨 · 혼자 접속 중' : status === 'online' ? `지금 ${peers.length + 1}명 접속 중` : '연결하는 중…';

  return (
    <details className="group mt-1 text-xs sm:text-sm">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 font-bold">
        <i className={`size-2 ${status === 'online' ? 'bg-[#2fbf87]' : 'bg-ink/30'}`} />
        {label}
        <span className="text-ink/40 group-open:rotate-180">▾</span>
      </summary>
      <ul className="mt-1.5 max-h-40 space-y-1 overflow-y-auto border-t-2 border-ink/10 pt-1.5">
        <li className="truncate">
          {myName || '나'} <span className="text-ink/50">(나)</span>
        </li>
        {peers.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-2">
            <span className={`truncate ${muted.includes(p.id) ? 'text-ink/40 line-through' : ''}`}>{p.name}</span>
            <button type="button" className="shrink-0 underline" onClick={() => toggleMute(p.id)}>
              {muted.includes(p.id) ? '다시 보기' : '숨기기'}
            </button>
          </li>
        ))}
        {peers.length === 0 && status === 'online' && <li className="text-ink/50">아직 다른 사람이 없어요</li>}
      </ul>
    </details>
  );
}

export function Hud() {
  const nearby = useGame((s) => getPerson(s.nearbyId));
  const spot = useGame((s) => getSpot(s.nearbySpot));
  const open = useGame((s) => s.open);
  const setDirectory = useGame((s) => s.setDirectory);

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-3 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="panel pointer-events-auto px-3 py-2 shadow-[3px_3px_0_var(--color-ink)]">
          <p className="font-display text-lg leading-tight sm:text-xl">CAU LIKE_LION WIKI</p>
          <p className="text-xs text-ink/70 sm:text-sm">주민 {people.length}명 · 읽기 전용 아카이브</p>
          <Online />
        </div>
        <div className="flex flex-col items-end gap-3">
          <button type="button" className="btn pointer-events-auto bg-lion px-3 py-2" onClick={() => setDirectory(true)}>
            주민 찾기 <kbd className="hidden sm:inline">Tab</kbd>
          </button>
          <Minimap />
        </div>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-2">
          <ChatBox />
          <Joystick />
          <p className="panel hidden px-3 py-2 text-sm shadow-[3px_3px_0_var(--color-ink)] pointer-fine:block">
            <kbd>←</kbd>
            <kbd>↑</kbd>
            <kbd>↓</kbd>
            <kbd>→</kbd> 이동 · <kbd>Space</kbd> 말 걸기 · <kbd>Enter</kbd> 채팅 · <kbd>Shift</kbd> 달리기
          </p>
        </div>

        <div className="flex min-h-14 flex-1 flex-col items-center justify-end gap-2" aria-live="polite">
          {nearby && (
            <button
              type="button"
              className="btn pointer-events-auto animate-pop bg-brand px-5 py-3 text-lg text-white"
              onClick={() => open(nearby.id)}
            >
              <kbd className="mr-2 hidden border-white/70 bg-white/15 text-white pointer-fine:inline">Space</kbd>
              {nearby.name}
              <span className="ml-1.5 text-sm font-normal opacity-85">({roleLine(nearby)})</span>에게 말 걸기
            </button>
          )}
          {!nearby && spot && (
            <button
              type="button"
              className="btn pointer-events-auto animate-pop bg-lion px-5 py-3 text-lg"
              onClick={() => activateSpot(spot.id)}
            >
              <kbd className="mr-2 hidden pointer-fine:inline">Space</kbd>
              {spot.label}
            </button>
          )}
        </div>

        <div className="hidden w-32 pointer-coarse:block" aria-hidden />
      </div>
    </div>
  );
}
