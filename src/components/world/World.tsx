'use client';

import { Canvas } from '@react-three/fiber';
import { CameraRig } from '@/components/world/CameraRig';
import { Markers } from '@/components/world/Markers';
import { Npcs } from '@/components/world/Npcs';
import { Player } from '@/components/world/Player';
import { Scenery } from '@/components/world/Scenery';
import { Visitors } from '@/components/world/Visitors';

const SKY = '#bfe6ff';

/** 3D 마을. next/dynamic(ssr: false) 로만 불러온다 */
export default function World() {
  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 2]}
      camera={{ fov: 48, near: 0.5, far: 420, position: [0, 14, 24] }}
      className="touch-none"
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={[SKY]} />
      <fog attach="fog" args={[SKY, 80, 230]} />
      <hemisphereLight args={['#ffffff', '#86c46a', 1.25]} />
      <CameraRig />
      <Scenery />
      <Npcs />
      <Player />
      <Visitors />
      <Markers />
    </Canvas>
  );
}
