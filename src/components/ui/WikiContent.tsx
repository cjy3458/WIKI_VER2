'use client';

import type { ComponentProps } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import { getPersonByName } from '@/lib/people';
import { useGame } from '@/lib/store';

// 본문은 사람들이 직접 쓴 마크다운 + HTML 이다. 반드시 sanitize 를 거쳐 그린다.

const schema = {
  ...defaultSchema,
  strip: ['script', 'style'],
  attributes: {
    ...defaultSchema.attributes,
    img: [...(defaultSchema.attributes?.img ?? []), 'alt', 'title', 'dataWidth'],
  },
};

interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

/** 원문의 `<img style="width: 30%">` 크기를 살린다. style 속성은 sanitize 가 지우므로 숫자만 따로 옮긴다 */
function keepImageWidth() {
  const walk = (node: HastNode) => {
    if (node.type === 'element' && node.tagName === 'img' && typeof node.properties?.style === 'string') {
      const match = node.properties.style.match(/width:\s*(\d{1,3})%/);
      if (match) node.properties.dataWidth = match[1];
    }
    node.children?.forEach(walk);
  };
  return (tree: HastNode) => walk(tree);
}

const WIKI_PREFIX = '#wiki/';

function WikiLink({ href, children }: ComponentProps<'a'>) {
  const open = useGame((s) => s.open);
  if (href?.startsWith(WIKI_PREFIX)) {
    let name = href.slice(WIKI_PREFIX.length);
    try {
      name = decodeURIComponent(name);
    } catch {
      // 깨진 인코딩은 그대로 둔다
    }
    const person = getPersonByName(name);
    if (!person) {
      return (
        <span className="wiki-missing" title="아카이브에 포함되지 않은 문서예요">
          {children}
        </span>
      );
    }
    return (
      <button type="button" className="wiki-link" onClick={() => open(person.id)}>
        {children}
      </button>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

function WikiImage(props: ComponentProps<'img'> & { 'data-width'?: string }) {
  const { src, alt, 'data-width': width } = props;
  if (typeof src !== 'string') return null;
  return (
    // 크기를 알 수 없는 사용자 업로드 이미지라 next/image 를 쓰지 않는다
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt ?? ''} loading="lazy" style={width ? { width: `${width}%` } : undefined} />
  );
}

const components = {
  a: WikiLink,
  img: WikiImage,
  table: (props: ComponentProps<'table'>) => (
    <div className="wiki-table">
      <table>{props.children}</table>
    </div>
  ),
};

export function WikiContent({ content }: { content: string }) {
  return (
    <div className="wiki">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeRaw, keepImageWidth, [rehypeSanitize, schema]]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
