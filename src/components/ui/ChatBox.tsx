'use client';

import { useEffect, useRef, useState } from 'react';
import { CHAT_MAX, useNet } from '@/lib/net';

export const CHAT_INPUT_ID = 'chat-input';
/** 빠른 인사. 채팅으로 보내지는 글자라 이모지 그대로 둔다 */
const EMOTES = ['👋', '😂', '❤️', '👍'];

/** 함께 접속한 사람들과의 채팅 창. 글자는 텍스트로만 그린다 */
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
    <section className="window pointer-events-auto flex w-72 flex-col sm:w-80" aria-label="채팅">
      <header className="window-bar">
        <span className="window-dots" aria-hidden />
        <span className="flex-1">CHAT</span>
        <span className="hidden text-xs text-muted pointer-fine:inline">
          <kbd>Enter</kbd> 입력
        </span>
      </header>
      {recent.length > 0 && (
        <ol
          ref={log}
          aria-live="polite"
          aria-label="채팅 기록"
          className="max-h-28 space-y-1 overflow-y-auto border-b-2 border-line px-3 py-2 text-sm leading-snug sm:max-h-40"
        >
          {recent.map((m) => (
            <li key={m.key} className="break-words">
              <span className={`font-medium ${m.self ? 'text-brand' : ''}`}>{m.name}</span>
              <span className="ml-2 text-ink">{m.text}</span>
            </li>
          ))}
        </ol>
      )}
      <form
        className="flex gap-2 p-2"
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
          placeholder={status === 'failed' ? '연결 안 됨, 혼자 접속 중' : '메시지'}
          aria-label="채팅 입력"
          className="field h-9 min-w-0 flex-1 px-3 text-sm"
        />
        <button type="submit" className="btn h-9 px-3 text-sm">
          보내기
        </button>
      </form>
      <div className="flex gap-1 border-t-2 border-line px-2 py-1.5">
        {EMOTES.map((emote) => (
          <button key={emote} type="button" className="emote" onClick={() => sendChat(emote)} aria-label={`${emote} 보내기`}>
            {emote}
          </button>
        ))}
      </div>
    </section>
  );
}
