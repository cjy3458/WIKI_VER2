import { create } from 'zustand';
import { player } from '@/lib/store';
import { WORLD_RADIUS } from '@/lib/village';

// 다른 접속자와의 실시간 통신. 서버 없이 브라우저끼리 직접(P2P) 연결한다.
// 통신 방식을 바꾸려면 이 파일만 바꾸면 된다. 설계: docs/multiplayer.md

const APP_ID = 'cau-likelion-wiki-village';
const ROOM_ID = 'village-1';
const PROFILE_KEY = 'wiki-village-profile';

export const NAME_MAX = 12;
export const CHAT_MAX = 100;
export const BUBBLE_MS = 6000;
export const AVATAR_COLORS = ['#ffffff', '#1f5fff', '#ff5d8f', '#2fbf87', '#f2b21d', '#8f7dff', '#2a2140'];
/** 말풍선·채팅에서 나 자신을 가리키는 id */
export const SELF = 'me';

export interface Profile {
  name: string;
  color: string;
}
export interface Peer extends Profile {
  id: string;
}
export interface ChatMessage {
  key: number;
  from: string;
  name: string;
  color: string;
  text: string;
  self: boolean;
}

/** 다른 접속자의 위치. 프레임 루프에서 직접 읽고 목표값(t*)으로 보간한다 */
export interface Remote {
  x: number;
  z: number;
  rot: number;
  tx: number;
  tz: number;
  trot: number;
  speed: number;
}
export const remotes = new Map<string, Remote>();

type Status = 'off' | 'connecting' | 'online' | 'failed';

interface NetState {
  status: Status;
  profile: Profile;
  peers: Peer[];
  messages: ChatMessage[];
  bubbles: Record<string, { text: string; at: number }>;
  muted: string[];
  loadProfile: () => void;
  setProfile: (profile: Partial<Profile>) => void;
  toggleMute: (id: string) => void;
  connect: () => Promise<void>;
  sendChat: (text: string) => boolean;
}

// ── 검증 ──────────────────────────────────────────

// 제어 문자(줄바꿈, 줄/문단 구분자 포함)를 공백으로 바꾸고 길이를 자른다
const isControl = (ch: string) => {
  const code = ch.codePointAt(0) ?? 0;
  return code < 0x20 || code === 0x7f || code === 0x2028 || code === 0x2029;
};
const clean = (value: unknown, max: number) =>
  typeof value === 'string'
    ? Array.from(
        Array.from(value, (ch) => (isControl(ch) ? ' ' : ch))
          .join('')
          .trim(),
      )
        .slice(0, max)
        .join('')
    : '';

const cleanColor = (value: unknown) => (typeof value === 'string' && AVATAR_COLORS.includes(value) ? value : AVATAR_COLORS[0]);

function cleanProfile(value: unknown): Profile | null {
  if (!value || typeof value !== 'object') return null;
  const { name, color } = value as Record<string, unknown>;
  const cleaned = clean(name, NAME_MAX);
  return cleaned ? { name: cleaned, color: cleanColor(color) } : null;
}

// ── 연결 ──────────────────────────────────────────

interface Action<T> {
  send: (data: T, options?: { target?: string }) => Promise<unknown>;
  onMessage: ((data: T, context: { peerId: string }) => void) | null;
}
interface Room {
  onPeerJoin: ((peerId: string) => void) | null;
  onPeerLeave: ((peerId: string) => void) | null;
  makeAction: <T>(id: string) => Action<T>;
  leave: () => void;
}

let room: Room | null = null;
let helloAction: Action<Profile> | null = null;
let chatAction: Action<{ t: string }> | null = null;
let messageKey = 0;
let lastSentChat = 0;
const lastChatFrom = new Map<string, number>();

const posNow = (): [number, number, number, number] => [
  Math.round(player.x * 100) / 100,
  Math.round(player.z * 100) / 100,
  Math.round(player.rot * 100) / 100,
  Math.round(player.speed * 10) / 10,
];

function pushMessage(message: Omit<ChatMessage, 'key'>) {
  useNet.setState((s) => ({
    messages: [...s.messages, { ...message, key: ++messageKey }].slice(-40),
    bubbles: { ...s.bubbles, [message.from]: { text: message.text, at: Date.now() } },
  }));
}

export const useNet = create<NetState>((set, get) => ({
  status: 'off',
  profile: { name: '', color: AVATAR_COLORS[0] },
  peers: [],
  messages: [],
  bubbles: {},
  muted: [],

  loadProfile: () => {
    // 화면이 준비되기 전에 이미 닉네임을 입력했다면 덮어쓰지 않는다
    if (get().profile.name) return;
    let saved: Profile | null = null;
    try {
      saved = cleanProfile(JSON.parse(localStorage.getItem(PROFILE_KEY) ?? 'null'));
    } catch {
      // 저장소를 못 쓰는 환경이면 기본값으로 간다
    }
    set({ profile: saved ?? { name: `아기사자${100 + Math.floor(Math.random() * 900)}`, color: AVATAR_COLORS[0] } });
  },

  setProfile: (patch) => {
    const profile = { ...get().profile, ...patch };
    profile.color = cleanColor(profile.color);
    set({ profile });
    const valid = cleanProfile(profile);
    if (!valid) return;
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(valid));
    } catch {
      // 무시
    }
    void helloAction?.send(valid);
  },

  toggleMute: (id) => {
    const muted = get().muted.includes(id) ? get().muted.filter((m) => m !== id) : [...get().muted, id];
    // 상대 id 는 접속할 때마다 바뀌므로 저장하지 않는다. 이번 접속 동안만 유지
    set({ muted });
  },

  connect: async () => {
    if (room || get().status === 'connecting') return;
    set({ status: 'connecting' });
    try {
      const me = (): Profile => cleanProfile(get().profile) ?? { name: '아기사자', color: AVATAR_COLORS[0] };
      const { joinRoom } = await import('trystero');
      const joined = joinRoom({ appId: APP_ID }, ROOM_ID) as unknown as Room;
      room = joined;

      const hello = joined.makeAction<Profile>('hello');
      const pos = joined.makeAction<[number, number, number, number]>('pos');
      const chat = joined.makeAction<{ t: string }>('chat');
      helloAction = hello;
      chatAction = chat;

      joined.onPeerJoin = (id) => {
        void hello.send(me(), { target: id });
        void pos.send(posNow(), { target: id });
      };
      joined.onPeerLeave = (id) => {
        remotes.delete(id);
        lastChatFrom.delete(id);
        set((s) => {
          const bubbles = { ...s.bubbles };
          delete bubbles[id];
          return { peers: s.peers.filter((p) => p.id !== id), bubbles };
        });
      };

      hello.onMessage = (data, { peerId }) => {
        const profile = cleanProfile(data);
        if (!profile) return;
        set((s) => {
          const others = s.peers.filter((p) => p.id !== peerId);
          return others.length >= 40 ? s : { peers: [...others, { id: peerId, ...profile }] };
        });
      };

      pos.onMessage = (data, { peerId }) => {
        if (!Array.isArray(data) || data.length !== 4 || !data.every((n) => typeof n === 'number' && Number.isFinite(n))) return;
        const [x, z, rot, speed] = data;
        if (Math.hypot(x, z) > WORLD_RADIUS + 1) return;
        const remote = remotes.get(peerId);
        if (remote) Object.assign(remote, { tx: x, tz: z, trot: rot, speed: Math.min(20, Math.max(0, speed)) });
        else remotes.set(peerId, { x, z, rot, tx: x, tz: z, trot: rot, speed: 0 });
      };

      chat.onMessage = (data, { peerId }) => {
        const text = clean((data as { t?: unknown } | null)?.t, CHAT_MAX);
        const from = get().peers.find((p) => p.id === peerId);
        if (!text || !from || get().muted.includes(peerId)) return;
        // 한 사람이 도배하지 못하게
        const now = Date.now();
        if (now - (lastChatFrom.get(peerId) ?? 0) < 500) return;
        lastChatFrom.set(peerId, now);
        pushMessage({ from: peerId, name: from.name, color: from.color, text, self: false });
      };

      // 내 위치 알리기: 움직일 때 초당 10회, 서 있을 때 초당 1회
      let lastKey = '';
      let lastAt = 0;
      window.setInterval(() => {
        if (remotes.size === 0 && get().peers.length === 0) return;
        const state = posNow();
        const key = state.join(',');
        const now = Date.now();
        if (key === lastKey && now - lastAt < 1000) return;
        lastKey = key;
        lastAt = now;
        void pos.send(state);
      }, 100);

      window.addEventListener('pagehide', () => joined.leave());
      set({ status: 'online' });
    } catch (error) {
      // 연결이 안 되면 혼자 접속한 상태로 계속 쓴다
      console.warn('[net] 다른 접속자와 연결하지 못했습니다', error);
      room = null;
      set({ status: 'failed' });
    }
  },

  sendChat: (raw) => {
    const text = clean(raw, CHAT_MAX);
    const now = Date.now();
    if (!text || now - lastSentChat < 700) return false;
    lastSentChat = now;
    const { profile } = get();
    pushMessage({ from: SELF, name: profile.name || '나', color: profile.color, text, self: true });
    void chatAction?.send({ t: text });
    return true;
  },
}));
