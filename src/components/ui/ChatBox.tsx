'use client';

import { useEffect, useRef, useState } from 'react';
import { CHAT_MAX, useNet } from '@/lib/net';

export const CHAT_INPUT_ID = 'chat-input';
const EMOTES = ['👋', '😂', '❤️', '👍'];

/** 함께 접속한 사람들과의 채팅. 글자는 텍스트로만 그린다 */
export function ChatBox() {
  const messages = useNet((s) => s.messages);
  const status = useNet((s) => s.status);
  const sendChat = useNet((s) => s.sendChat);
  const [text, setText] = useState('');
  const log = useRef<HTMLOListElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [messages]);

  const recent = messages.slice(-30);

  return (
    <div className="pointer-events-auto flex w-64 flex-col gap-1.5 sm:w-80">
      {recent.length > 0 && (
        <ol
          ref={log}
          aria-live="polite"
          aria-label="채팅 기록"
          className="max-h-28 overflow-y-auto border-2 border-ink/80 bg-paper/85 px-2.5 py-1.5 text-sm leading-snug sm:max-h-40"
        >
          {recent.map((m) => (
            <li key={m.key} className="break-words">
              <b className={m.self ? 'text-brand' : ''}>{m.name}</b>
              <span className="text-ink/50"> : </span>
              {m.text}
            </li>
          ))}
        </ol>
      )}
      <form
        className="flex gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          // 빈 채로 Enter 면 입력을 끝내고 다시 걸어 다닌다
          if (!text.trim()) {
            input.current?.blur();
            return;
          }
          if (sendChat(text)) setText('');
        }}
      >
        <input
          id={CHAT_INPUT_ID}
          ref={input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') e.currentTarget.blur();
          }}
          maxLength={CHAT_MAX}
          autoComplete="off"
          enterKeyHint="send"
          placeholder={status === 'failed' ? '연결 안 됨 (혼자 접속 중)' : 'Enter 로 채팅'}
          aria-label="채팅 입력"
          className="min-w-0 flex-1 border-[3px] border-ink bg-white/95 px-3 py-1.5 text-sm outline-none focus:ring-4 focus:ring-brand/30"
        />
        <button type="submit" className="btn px-3 py-1 text-sm">
          보내기
        </button>
      </form>
      <div className="flex gap-1.5">
        {EMOTES.map((emote) => (
          <button key={emote} type="button" className="btn px-2 py-0.5 text-base" onClick={() => sendChat(emote)} aria-label={`${emote} 보내기`}>
            {emote}
          </button>
        ))}
      </div>
    </div>
  );
}
