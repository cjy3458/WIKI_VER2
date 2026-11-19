"use client";

import { Search } from "lucide-react";
import { useEffect, useRef } from "react";
import { ChatBox } from "@/components/ui/ChatBox";
import { AVATAR_COLORS, NAME_MAX, remotes, useNet } from "@/lib/net";
import { PART_COLOR, getPerson, people, roleLine } from "@/lib/people";
import { controls, player, useGame } from "@/lib/store";
import { activateSpot } from "@/components/Game";
import {
  PLAZA_HALF,
  WORLD_HALF,
  getSpot,
  landmarks,
  village,
} from "@/lib/village";

const MAP_SIZE = 168;

/** 위가 북쪽인 미니맵. 10fps 로만 다시 그린다 */
function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = canvas.height = MAP_SIZE * ratio;
    const scale = MAP_SIZE / (WORLD_HALF * 2);
    const at = (v: number) => (v + WORLD_HALF) * scale;
    const block = (x: number, z: number, size: number, fill: string) => {
      ctx.fillStyle = "#000000";
      ctx.fillRect(
        at(x) - size / 2 - 1,
        at(z) - size / 2 - 1,
        size + 2,
        size + 2,
      );
      ctx.fillStyle = fill;
      ctx.fillRect(at(x) - size / 2, at(z) - size / 2, size, size);
    };

    const draw = () => {
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.fillStyle = "#55b532";
      ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);

      ctx.fillStyle = "#ecd9a6";
      for (const r of village.roads)
        ctx.fillRect(
          at(r.x - r.w / 2),
          at(r.z - r.d / 2),
          r.w * scale,
          r.d * scale,
        );
      ctx.fillStyle = "#fbf6e6";
      ctx.fillRect(
        at(-PLAZA_HALF),
        at(-PLAZA_HALF),
        PLAZA_HALF * 2 * scale,
        PLAZA_HALF * 2 * scale,
      );
      const { pond, tower, portal, lounge } = landmarks;
      ctx.fillStyle = "#0aa0e6";
      ctx.fillRect(
        at(pond.x - pond.half),
        at(pond.z - pond.half),
        pond.half * 2 * scale,
        pond.half * 2 * scale,
      );
      // 건축물: 타워(파랑), 포털(분홍), 모닥불(주황)
      block(tower.x, tower.z, 13, "#4c4df5");
      block(portal.x, portal.z, 9, "#ff5d8f");
      block(lounge.x, lounge.z, 9, "#ff8a1f");

      // 주민: 파트 색 점. 지금 말 걸 수 있는 사람은 크게
      const nearbyId = useGame.getState().nearbyId;
      for (const npc of village.npcs) {
        const size = npc.id === nearbyId ? 7 : 4;
        ctx.fillStyle = "#000000";
        ctx.fillRect(
          at(npc.x) - size / 2 - 1,
          at(npc.z) - size / 2 - 1,
          size + 2,
          size + 2,
        );
        ctx.fillStyle = PART_COLOR[npc.part];
        ctx.fillRect(at(npc.x) - size / 2, at(npc.z) - size / 2, size, size);
      }

      // 함께 접속한 사람들: 흰 네모
      const { peers, muted } = useNet.getState();
      for (const peer of peers) {
        const remote = remotes.get(peer.id);
        if (!remote || muted.includes(peer.id)) continue;
        block(remote.x, remote.z, 6, "#ffffff");
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
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#000000";
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
    <figure className="window pointer-events-none" aria-hidden>
      <figcaption className="window-bar">
        <span className="window-dots" />
        MAP
      </figcaption>
      <canvas ref={canvasRef} className="block size-28 sm:size-[168px]" />
    </figure>
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
    if (knob.current)
      knob.current.style.transform = `translate(${x * 34}px, ${y * 34}px)`;
  };
  const release = () => {
    controls.stick.x = controls.stick.y = 0;
    if (knob.current) knob.current.style.transform = "";
  };

  return (
    <div
      className="window pointer-events-auto hidden size-32 touch-none place-items-center pointer-coarse:grid"
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

/** 마을 상태 창: 주민 수와 지금 접속 중인 사람. 펼치면 내 캐릭터 설정과 접속자 목록 */
function Status() {
  const status = useNet((s) => s.status);
  const peers = useNet((s) => s.peers);
  const muted = useNet((s) => s.muted);
  const profile = useNet((s) => s.profile);
  const setProfile = useNet((s) => s.setProfile);
  const toggleMute = useNet((s) => s.toggleMute);

  const online = status === "online";
  const label =
    status === "failed"
      ? "혼자 접속 중"
      : online
        ? `${peers.length + 1}명 접속 중`
        : "연결하는 중";

  return (
    <section
      className="window pointer-events-auto w-60 sm:w-64"
      aria-label="마을 상태"
    >
      <header className="window-bar">
        <span className="window-dots" aria-hidden />
        LIKELION.EXE
      </header>
      <p className="px-4 pt-3 font-display text-lg leading-tight">위키 마을</p>
      <details className="group">
        {/* 숫자는 늘 보이고, 누르면 내 캐릭터 설정과 접속자 목록이 펼쳐진다 */}
        <summary className="flex h-10 cursor-pointer list-none items-center gap-2 px-4 text-[13px] text-secondary [&::-webkit-details-marker]:hidden">
          <span className="tabular-nums">주민 {people.length}</span>
          <span className="text-muted">·</span>
          <span
            className={`size-2 ${online ? "bg-positive" : "bg-muted"}`}
            aria-hidden
          />
          <span className="flex-1 tabular-nums">{label}</span>
          <span className="text-muted group-open:hidden">설정</span>
          <span
            className="text-xs text-muted group-open:rotate-180"
            aria-hidden
          >
            ▾
          </span>
        </summary>
        <div className="border-t-2 border-line px-4 pb-4 pt-3 text-sm">
          <p className="text-xs text-muted">내 캐릭터</p>
          <input
            value={profile.name}
            onChange={(e) =>
              setProfile({ name: e.target.value.slice(0, NAME_MAX) })
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape")
                e.currentTarget.blur();
            }}
            maxLength={NAME_MAX}
            autoComplete="off"
            aria-label="내 닉네임"
            className="field mt-2 h-9 w-full px-3"
          />
          <div
            className="mt-2 flex gap-1.5"
            role="radiogroup"
            aria-label="옷 색"
          >
            {AVATAR_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                role="radio"
                aria-checked={profile.color === color}
                aria-label={`옷 색 ${color}`}
                onClick={() => setProfile({ color })}
                className="swatch"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          <p className="mt-4 text-xs text-muted">함께 있는 사람</p>
          <ul className="mt-1 max-h-32 overflow-y-auto">
            {peers.map((p) => (
              <li
                key={p.id}
                className="flex h-8 items-center justify-between gap-2"
              >
                <span
                  className={`truncate ${muted.includes(p.id) ? "text-muted line-through" : ""}`}
                >
                  {p.name}
                </span>
                <button
                  type="button"
                  className="link-quiet shrink-0"
                  onClick={() => toggleMute(p.id)}
                >
                  {muted.includes(p.id) ? "다시 보기" : "숨기기"}
                </button>
              </li>
            ))}
            {peers.length === 0 && (
              <li className="flex h-8 items-center text-muted">
                아직 아무도 없어요
              </li>
            )}
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            서버 없이 브라우저끼리 직접 연결돼요
            <br />
            채팅은 어디에도 저장되지 않아요
            <br />
            방문자 수와 접속 지역만 집계해요
          </p>
        </div>
      </details>
    </section>
  );
}

/** 화면 아래 가운데: 지금 할 수 있는 일 하나 */
function Prompt({
  hotkey,
  onClick,
  children,
}: {
  hotkey: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="btn btn-primary pointer-events-auto h-12 animate-pop gap-3 px-5 text-lg"
      onClick={onClick}
    >
      <kbd className="kbd-on-primary hidden pointer-fine:inline-block">
        {hotkey}
      </kbd>
      {children}
    </button>
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
        <Status />
        <div className="flex flex-col items-end gap-3">
          <button
            type="button"
            className="btn pointer-events-auto h-10 gap-2 px-3"
            onClick={() => setDirectory(true)}
          >
            <Search size={16} strokeWidth={2} aria-hidden />
            주민 찾기
            <kbd className="hidden sm:inline-block">Tab</kbd>
          </button>
          <Minimap />
        </div>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-3">
          <ChatBox />
          <Joystick />
          <p className="keys hidden pointer-fine:flex">
            <span>
              <kbd>←</kbd>
              <kbd>↑</kbd>
              <kbd>↓</kbd>
              <kbd>→</kbd> 이동
            </span>
            <span>
              <kbd>Shift</kbd> 달리기
            </span>
            <span>
              <kbd>Space</kbd> 말 걸기
            </span>
          </p>
        </div>

        <div
          className="flex min-h-14 flex-1 flex-col items-center justify-end gap-2"
          aria-live="polite"
        >
          {nearby && (
            <Prompt hotkey="Space" onClick={() => open(nearby.id)}>
              <span>
                {nearby.name}
                <span className="ml-2 text-sm opacity-80">
                  {roleLine(nearby)}
                </span>
              </span>
              <span>에게 말 걸기</span>
            </Prompt>
          )}
          {!nearby && spot && (
            <Prompt hotkey="Space" onClick={() => activateSpot(spot.id)}>
              {spot.label}
            </Prompt>
          )}
        </div>

        <div className="hidden w-32 pointer-coarse:block" aria-hidden />
      </div>
    </div>
  );
}
