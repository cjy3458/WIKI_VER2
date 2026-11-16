import { create } from 'zustand';
import { SPAWN, getNpc, spotNear } from '@/lib/village';

// 드물게 바뀌는 값만 React 상태로 둔다. 매 프레임 바뀌는 값은 아래 plain object.

interface GameState {
  phase: 'intro' | 'play';
  /** 말을 걸 수 있는 거리 안의 NPC */
  nearbyId: number | null;
  /** 글이 열려 있는 사람 */
  openId: number | null;
  directoryOpen: boolean;
  enter: () => void;
  setNearby: (id: number | null) => void;
  open: (id: number) => void;
  close: () => void;
  setDirectory: (open: boolean) => void;
  /** 그 주민 바로 앞으로 순간이동 */
  teleportTo: (id: number) => void;
}

export const useGame = create<GameState>((set) => ({
  phase: 'intro',
  nearbyId: null,
  openId: null,
  directoryOpen: false,
  enter: () => set({ phase: 'play' }),
  setNearby: (id) => set((s) => (s.nearbyId === id ? s : { nearbyId: id })),
  open: (id) => set({ openId: id, directoryOpen: false }),
  close: () => set({ openId: null }),
  setDirectory: (open) => set({ directoryOpen: open }),
  teleportTo: (id) => {
    const npc = getNpc(id);
    if (!npc) return;
    const spot = spotNear(npc);
    player.x = spot.x;
    player.z = spot.z;
    player.rot = spot.rot;
    player.speed = 0;
    // 카메라는 플레이어 등 뒤에서 주민을 마주 보게
    cameraState.yaw = spot.rot + Math.PI;
    cameraState.pitch = 0.42;
    cameraState.distance = 13;
    cameraState.snap = true;
    set({ phase: 'play', directoryOpen: false, openId: null, nearbyId: id });
  },
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

/** snap: 다음 프레임에 카메라를 부드럽게 따라가지 않고 바로 옮긴다 (순간이동 직후) */
export const cameraState = { yaw: 0, pitch: 0.46, distance: 19, snap: true };

export function resetControls() {
  const k = controls.keys;
  k.up = k.down = k.left = k.right = k.run = false;
  controls.stick.x = controls.stick.y = 0;
}
