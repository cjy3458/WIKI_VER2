'use client';

import { Canvas } from '@react-three/fiber';
import { CameraRig } from '@/components/world/CameraRig';
import { Markers } from '@/components/world/Markers';
import { Npcs } from '@/components/world/Npcs';
import { Player } from '@/components/world/Player';
import { Scenery } from '@/components/world/Scenery';
import { Visitors } from '@/components/world/Visitors';

/** 픽셀 섬. 캔버스는 투명하고 뒤의 파란 모눈이 하늘이 된다. next/dynamic(ssr: false) 로만 불러온다 */
export default function World() {
  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 2]}
      camera={{ fov: 48, near: 0.5, far: 600, position: [0, 14, 24] }}
      gl={{ alpha: true }}
      className="touch-none"
      style={{ position: 'absolute', inset: 0 }}
    >
      <hemisphereLight args={['#ffffff', '#8fb0ff', 1.35]} />
      <CameraRig />
      <Scenery />
      <Npcs />
      <Player />
      <Visitors />
      <Markers />
    </Canvas>
  );
}
