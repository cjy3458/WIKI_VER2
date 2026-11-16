import { create } from 'zustand';
import { SPAWN } from '@/lib/village';

// 드물게 바뀌는 값만 React 상태로 둔다. 매 프레임 바뀌는 값은 아래 plain object.

interface GameState {
  phase: 'intro' | 'play';
  /** 말을 걸 수 있는 거리 안의 NPC */
  nearbyId: number | null;
  /** 글이 열려 있는 사람 */
  openId: number | null;
  directoryOpen: boolean;
  /** 길 안내 중인 사람 */
  guideId: number | null;
  enter: () => void;
  setNearby: (id: number | null) => void;
  open: (id: number) => void;
  close: () => void;
  setDirectory: (open: boolean) => void;
  guideTo: (id: number | null) => void;
}

export const useGame = create<GameState>((set) => ({
  phase: 'intro',
  nearbyId: null,
  openId: null,
  directoryOpen: false,
  guideId: null,
  enter: () => set({ phase: 'play' }),
  setNearby: (id) => set((s) => (s.nearbyId === id ? s : { nearbyId: id })),
  open: (id) => set((s) => ({ openId: id, directoryOpen: false, guideId: s.guideId === id ? null : s.guideId })),
  close: () => set({ openId: null }),
  setDirectory: (open) => set({ directoryOpen: open }),
  guideTo: (id) => set({ guideId: id, directoryOpen: false, openId: null, phase: 'play' }),
}));

/** 화면에 글/명부가 떠 있어 캐릭터 조작을 막아야 하는가 */
export const isBlocked = () => {
  const s = useGame.getState();
  return s.phase !== 'play' || s.openId !== null || s.directoryOpen;
};

/** 플레이어 위치/방향 — 프레임 루프에서 직접 읽고 쓴다 */
export const player = { x: SPAWN.x, z: SPAWN.z, rot: SPAWN.rot, speed: 0 };

/** 키보드와 조이스틱 입력. x: 오른쪽(+), y: 앞(+) */
export const controls = {
  keys: { up: false, down: false, left: false, right: false, run: false },
  stick: { x: 0, y: 0 },
};

export const cameraState = { yaw: 0, pitch: 0.46, distance: 19 };

export function resetControls() {
  const k = controls.keys;
  k.up = k.down = k.left = k.right = k.run = false;
  controls.stick.x = controls.stick.y = 0;
}
