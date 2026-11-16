'use client';

import { useEffect, useRef } from 'react';
import { PART_COLOR, getPerson, people, roleLine } from '@/lib/people';
import { controls, player, useGame } from '@/lib/store';
import { PLAZA_RADIUS, WORLD_RADIUS, village } from '@/lib/village';

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
    const scale = MAP_SIZE / 2 / (WORLD_RADIUS + 8);
    const at = (v: number) => MAP_SIZE / 2 + v * scale;

    const draw = () => {
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, MAP_SIZE, MAP_SIZE);
      ctx.beginPath();
      ctx.arc(MAP_SIZE / 2, MAP_SIZE / 2, MAP_SIZE / 2 - 2, 0, Math.PI * 2);
      ctx.fillStyle = '#a8dc85';
      ctx.fill();
      ctx.save();
      ctx.clip();

      ctx.strokeStyle = '#e8d39c';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      for (const p of village.paths) {
        const hx = (Math.sin(p.rot) * p.length) / 2;
        const hz = (Math.cos(p.rot) * p.length) / 2;
        ctx.beginPath();
        ctx.moveTo(at(p.x - hx), at(p.z - hz));
        ctx.lineTo(at(p.x + hx), at(p.z + hz));
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(at(0), at(0), PLAZA_RADIUS * scale, 0, Math.PI * 2);
      ctx.fillStyle = '#f2e2b1';
      ctx.fill();

      // 주민: 파트 색 점. 지금 말 걸 수 있는 사람은 크게
      const nearbyId = useGame.getState().nearbyId;
      for (const npc of village.npcs) {
        ctx.beginPath();
        ctx.arc(at(npc.x), at(npc.z), npc.id === nearbyId ? 4.5 : 2.6, 0, Math.PI * 2);
        ctx.fillStyle = PART_COLOR[npc.part];
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#2a2140';
        ctx.stroke();
      }

      // 플레이어: 바라보는 방향의 화살표
      ctx.translate(at(player.x), at(player.z));
      ctx.rotate(Math.PI - player.rot);
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(5, 5);
      ctx.lineTo(0, 2);
      ctx.lineTo(-5, 5);
      ctx.closePath();
      ctx.fillStyle = '#1f5fff';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
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
      className="size-28 rounded-full border-[3px] border-ink shadow-[3px_3px_0_var(--color-ink)] sm:size-[168px]"
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
      className="pointer-events-auto hidden size-32 touch-none place-items-center rounded-full border-[3px] border-ink bg-paper/70 pointer-coarse:grid"
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
      <div ref={knob} className="size-14 rounded-full border-[3px] border-ink bg-lion" />
    </div>
  );
}

export function Hud() {
  const nearby = useGame((s) => getPerson(s.nearbyId));
  const open = useGame((s) => s.open);
  const setDirectory = useGame((s) => s.setDirectory);

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-3 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="panel pointer-events-auto rounded-2xl px-3 py-2 shadow-[3px_3px_0_var(--color-ink)]">
          <p className="font-display text-lg leading-tight sm:text-xl">멋사 중앙대 위키 마을</p>
          <p className="text-xs text-ink/70 sm:text-sm">주민 {people.length}명 · 읽기 전용 아카이브</p>
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
          <Joystick />
          <p className="panel hidden rounded-xl px-3 py-2 text-sm shadow-[3px_3px_0_var(--color-ink)] pointer-fine:block">
            <kbd>W</kbd>
            <kbd>A</kbd>
            <kbd>S</kbd>
            <kbd>D</kbd> 이동 · <kbd>Shift</kbd> 달리기 · 드래그 시점 · 휠 줌
          </p>
        </div>

        <div className="flex min-h-14 flex-1 flex-col items-center justify-end gap-2" aria-live="polite">
          {nearby && (
            <button
              type="button"
              className="btn pointer-events-auto animate-pop bg-brand px-5 py-3 text-lg text-white"
              onClick={() => open(nearby.id)}
            >
              <kbd className="mr-2 hidden border-white/70 bg-white/15 text-white pointer-fine:inline">E</kbd>
              {nearby.name}
              <span className="ml-1.5 text-sm font-normal opacity-85">({roleLine(nearby)})</span>에게 말 걸기
            </button>
          )}
        </div>

        <div className="hidden w-32 pointer-coarse:block" aria-hidden />
      </div>
    </div>
  );
}
