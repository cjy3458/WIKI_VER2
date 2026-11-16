import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** 지오메트리 전체를 한 색으로 칠한다 (vertexColors 재질용) */
export function paint<T extends THREE.BufferGeometry>(geometry: T, color: string): T {
  const c = new THREE.Color(color);
  const count = geometry.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) colors.set([c.r, c.g, c.b], i * 3);
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

export function box(w: number, h: number, d: number, x: number, y: number, z: number, color: string) {
  return paint(new THREE.BoxGeometry(w, h, d).translate(x, y, z), color);
}

/** 여러 조각을 하나로 합치고 조각은 해제한다. 인덱스 유무가 섞이지 않게 전부 non-indexed로 맞춘다 */
export function mergeAll(parts: THREE.BufferGeometry[]) {
  const flat = parts.map((p) => (p.index ? p.toNonIndexed() : p));
  const merged = mergeGeometries(flat);
  parts.forEach((p) => p.dispose());
  flat.forEach((p) => p.dispose());
  return merged;
}

/** 각도를 가까운 쪽으로 부드럽게 따라가게 한다 */
export function dampAngle(current: number, target: number, lambda: number, dt: number) {
  let diff = (target - current) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * (1 - Math.exp(-lambda * dt));
}

/**
 * 픽셀 아트 텍스처. 문자열 한 줄이 픽셀 한 줄이고, 글자마다 palette 의 색을 찍는다.
 * 확대해도 뭉개지지 않게 NearestFilter 로 반복한다.
 */
export function pixelTexture(rows: string[], palette: Record<string, string>, repeat?: [number, number]) {
  const canvas = document.createElement('canvas');
  canvas.width = rows[0].length;
  canvas.height = rows.length;
  const ctx = canvas.getContext('2d')!;
  rows.forEach((row, y) => {
    Array.from(row).forEach((ch, x) => {
      const color = palette[ch];
      if (!color) return;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    });
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  // 가까이서는 또렷한 픽셀, 멀리서는 밉맵으로 뭉개 얼룩(모아레)을 없앤다
  texture.minFilter = THREE.NearestMipmapLinearFilter;
  texture.generateMipmaps = true;
  if (repeat) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(...repeat);
  }
  return texture;
}

interface LabelOptions {
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  color?: string;
  background?: string;
  accent?: string;
}

/** 글자를 그린 캔버스 텍스처 (이름표, 표지판, 말풍선). 구버전 위키처럼 검은 테두리의 네모 상자 */
export function createLabelTexture(text: string, o: LabelOptions) {
  const canvas = document.createElement('canvas');
  canvas.width = o.width;
  canvas.height = o.height;
  const ctx = canvas.getContext('2d')!;
  const border = Math.max(4, Math.round(o.height * 0.06));
  const shadow = border;
  const pad = 4;
  const boxHeight = o.height - pad * 2 - shadow;
  ctx.font = `${o.fontSize}px ${o.fontFamily}`;
  const textWidth = ctx.measureText(text).width;
  const dot = o.accent ? o.fontSize * 0.85 : 0;
  const boxWidth = Math.min(o.width - pad * 2 - shadow, textWidth + dot + o.fontSize * 0.9);
  const left = Math.round((o.width - boxWidth - shadow) / 2);

  // 딱딱한 그림자 → 테두리 → 바탕
  ctx.fillStyle = '#000000';
  ctx.fillRect(left + shadow, pad + shadow, boxWidth, boxHeight);
  ctx.fillRect(left, pad, boxWidth, boxHeight);
  ctx.fillStyle = o.background ?? '#ffffff';
  ctx.fillRect(left + border, pad + border, boxWidth - border * 2, boxHeight - border * 2);

  const middle = pad + boxHeight / 2;
  if (o.accent) {
    const size = o.fontSize * 0.42;
    ctx.fillStyle = '#000000';
    ctx.fillRect(left + border + o.fontSize * 0.3 - 3, middle - size / 2 - 3, size + 6, size + 6);
    ctx.fillStyle = o.accent;
    ctx.fillRect(left + border + o.fontSize * 0.3, middle - size / 2, size, size);
  }
  ctx.fillStyle = o.color ?? '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, left + boxWidth / 2 + dot / 2, middle + o.fontSize * 0.04);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** layout.tsx 가 심어 둔 픽셀 글꼴(둥근모) 이름 */
export function displayFontFamily() {
  const value = getComputedStyle(document.documentElement).getPropertyValue('--font-pixel').trim();
  return value || 'monospace';
}
