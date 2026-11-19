'use client';

import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LAYER } from '@/components/world/geo';

/** 가려진 사자가 비쳐 보이는 진하기 */
const XRAY_OPACITY = 0.5;

type Drawable = THREE.Mesh & { material: THREE.Material };

// 매 프레임 쓰는 것들은 모듈 범위에 두고 재사용한다
/** 2단계의 1차: 색은 안 쓰고 깊이만 기록 → 사자의 가장 앞쪽 면만 남는다 */
const depthOnly = new THREE.MeshBasicMaterial({ colorWrite: false });
/** 2단계의 2차에 쓸 반투명 복제 재질 (원본 재질마다 하나) */
const xrayCopies = new WeakMap<THREE.Material, THREE.Material>();
const lions: Drawable[] = [];
const originals: THREE.Material[] = [];

function xrayOf(material: THREE.Material) {
  let copy = xrayCopies.get(material);
  if (!copy) {
    copy = material.clone();
    copy.transparent = true;
    copy.opacity = XRAY_OPACITY;
    copy.depthWrite = false;
    copy.depthFunc = THREE.LessEqualDepth;
    xrayCopies.set(material, copy);
  }
  // 원본 색이 바뀌었을 수 있다 (내 옷 색 바꾸기 등)
  const source = material as THREE.MeshStandardMaterial;
  const target = copy as THREE.MeshStandardMaterial;
  if (source.color && target.color) target.color.copy(source.color);
  return copy;
}

/**
 * 장면을 세 번에 나눠 그린다.
 *
 * 1. 평소대로 전부 (사자 포함, 이름표 제외)
 * 2. 깊이를 지우고 사자만 한 번 더, 반투명으로.
 *    풍경은 무시하고 사자끼리·자기 몸끼리의 앞뒤만 계산하므로, 나무·집 뒤에 있는 사자도
 *    "실제 모습"(앞이면 얼굴, 뒤면 뒤통수)이 비쳐 보인다. 가려지지 않은 사자는 같은 그림이 겹칠 뿐이라 변화가 없다.
 * 3. 이름표·말풍선 (항상 맨 위)
 */
export function XrayRenderer() {
  useFrame(({ gl, scene, camera }) => {
    lions.length = 0;
    scene.traverse((object) => {
      // 조명은 모든 단계에서 똑같이 비춰야 색이 같다
      if ((object as THREE.Light).isLight) object.layers.enable(LAYER.lion);
      else if ((object as THREE.Mesh).isMesh && object.layers.isEnabled(LAYER.lion)) lions.push(object as Drawable);
    });

    gl.autoClear = false;
    gl.clear();

    // 1) 평소대로
    camera.layers.set(0);
    gl.render(scene, camera);

    // 2) 사자만 다시
    const shadowAuto = gl.shadowMap.autoUpdate;
    gl.shadowMap.autoUpdate = false;
    gl.clearDepth();
    camera.layers.set(LAYER.lion);
    scene.overrideMaterial = depthOnly;
    gl.render(scene, camera);
    scene.overrideMaterial = null;
    originals.length = 0;
    for (const mesh of lions) {
      originals.push(mesh.material);
      mesh.material = xrayOf(mesh.material);
    }
    gl.render(scene, camera);
    lions.forEach((mesh, i) => (mesh.material = originals[i]));
    lions.length = 0;

    // 3) 이름표·말풍선
    camera.layers.set(LAYER.tag);
    gl.render(scene, camera);

    camera.layers.set(0);
    gl.shadowMap.autoUpdate = shadowAuto;
  }, 1);

  return null;
}
