import { box, mergeAll } from '@/components/world/geo';

// 구버전 위키의 픽셀 사자 마스코트를 기본 도형으로 옮긴 로우폴리 사자. 정면은 +z.

export const LION = {
  fur: '#ffd83a',
  mane: '#de7c1e',
  dark: '#2a2140',
  ear: '#fff3b0',
};

const HIP_Y = 0.42;
const SHOULDER_Y = 0.98;
export const LEG_OFFSET = 0.18;
export const ARM_OFFSET = 0.46;
export const LIMB_PIVOT = { hip: HIP_Y, shoulder: SHOULDER_Y };

/** 머리·갈기·얼굴·꼬리 (움직이지 않는 부분) */
function headParts() {
  return [
    box(1.16, 1.1, 0.5, 0, 1.56, -0.08, LION.mane),
    box(0.86, 0.8, 0.6, 0, 1.52, 0.1, LION.fur),
    box(0.24, 0.22, 0.2, -0.4, 2.14, 0.02, LION.fur),
    box(0.24, 0.22, 0.2, 0.4, 2.14, 0.02, LION.fur),
    box(0.12, 0.1, 0.04, -0.4, 2.12, 0.13, LION.ear),
    box(0.12, 0.1, 0.04, 0.4, 2.12, 0.13, LION.ear),
    box(0.09, 0.17, 0.04, -0.2, 1.6, 0.41, LION.dark),
    box(0.09, 0.17, 0.04, 0.2, 1.6, 0.41, LION.dark),
    box(0.17, 0.08, 0.05, 0, 1.42, 0.42, LION.dark),
    box(0.06, 0.1, 0.05, 0, 1.34, 0.42, LION.dark),
    box(0.1, 0.1, 0.36, 0, 0.62, -0.4, LION.fur),
    box(0.2, 0.2, 0.2, 0, 0.7, -0.64, LION.mane),
  ];
}

/** 관절이 원점(위쪽 끝)에 오도록 만든 팔/다리 */
const legPart = () => box(0.25, HIP_Y, 0.27, 0, -HIP_Y / 2, 0, LION.fur);
const armPart = () => box(0.18, 0.48, 0.2, 0, -0.24, 0, LION.fur);
const shirtPart = () => box(0.74, 0.62, 0.46, 0, 0.72, 0, '#ffffff');

/** NPC용: 전신을 두 덩어리(고정색 / 옷)로 합쳐 인스턴싱한다 */
export function createNpcGeometries() {
  const body = mergeAll([
    ...headParts(),
    legPart().translate(-LEG_OFFSET, HIP_Y, 0),
    legPart().translate(LEG_OFFSET, HIP_Y, 0),
    armPart().translate(-ARM_OFFSET, SHOULDER_Y, 0),
    armPart().translate(ARM_OFFSET, SHOULDER_Y, 0),
  ]);
  return { body, shirt: shirtPart() };
}

/** 실루엣용: 전신을 한 덩어리로 */
export function createGhostGeometry() {
  const { body, shirt } = createNpcGeometries();
  return mergeAll([body, shirt]);
}

/** 플레이어용: 팔다리를 따로 움직인다 */
export function createPlayerGeometries() {
  return { head: mergeAll(headParts()), leg: legPart(), arm: armPart(), shirt: shirtPart() };
}
