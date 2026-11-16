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

interface LabelOptions {
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  color?: string;
  background?: string;
  accent?: string;
}

/** 글자를 그린 캔버스 텍스처 (이름표, 마을 표지판) */
export function createLabelTexture(text: string, o: LabelOptions) {
  const canvas = document.createElement('canvas');
  canvas.width = o.width;
  canvas.height = o.height;
  const ctx = canvas.getContext('2d')!;
  const pad = 6;
  const radius = (o.height - pad * 2) / 2;
  ctx.font = `${o.fontSize}px ${o.fontFamily}`;
  const textWidth = ctx.measureText(text).width;
  const dot = o.accent ? o.fontSize * 0.9 : 0;
  const boxWidth = Math.min(o.width - pad * 2, textWidth + dot + radius * 2);
  const left = (o.width - boxWidth) / 2;

  ctx.beginPath();
  ctx.roundRect(left, pad, boxWidth, o.height - pad * 2, radius);
  ctx.fillStyle = o.background ?? 'rgba(255,255,255,0.94)';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(42,33,64,0.9)';
  ctx.stroke();

  if (o.accent) {
    ctx.beginPath();
    ctx.arc(left + radius * 0.95, o.height / 2, o.fontSize * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = o.accent;
    ctx.fill();
  }
  ctx.fillStyle = o.color ?? '#2a2140';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, o.width / 2 + dot / 2, o.height / 2 + o.fontSize * 0.06);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** layout.tsx 가 심어 둔 표시용 글꼴 이름 */
export function displayFontFamily() {
  const value = getComputedStyle(document.documentElement).getPropertyValue('--font-jua').trim();
  return value || 'sans-serif';
}
