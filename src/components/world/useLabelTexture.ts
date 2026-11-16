'use client';

import { useEffect, useState } from 'react';
import type * as THREE from 'three';
import { createLabelTexture, displayFontFamily } from '@/components/world/geo';

export interface LabelStyle {
  width: number;
  height: number;
  fontSize: number;
  color?: string;
  background?: string;
}

/** 글자를 그린 텍스처. 웹폰트를 받은 뒤에 그린다 */
export function useLabelTexture(text: string | null, style: LabelStyle) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const { width, height, fontSize, color, background } = style;

  useEffect(() => {
    if (!text) return;
    let cancelled = false;
    let created: THREE.Texture | null = null;
    const fontFamily = displayFontFamily();
    document.fonts
      .load(`${fontSize}px ${fontFamily}`, text)
      .catch(() => undefined)
      .then(() => {
        if (cancelled) return;
        created = createLabelTexture(text, { width, height, fontSize, fontFamily, color, background });
        setTexture(created);
      });
    return () => {
      cancelled = true;
      created?.dispose();
      setTexture(null);
    };
  }, [text, width, height, fontSize, color, background]);

  return texture;
}
