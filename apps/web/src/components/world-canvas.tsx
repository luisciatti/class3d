'use client';

import { Html, OrbitControls, OrthographicCamera } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';

const rooms = [
  {
    slug: 'git',
    label: 'Git',
    accent: 'Fundamentos',
    position: [-3.2, 0, 2.2] as const,
    color: '#13b7a6',
  },
  {
    slug: 'ci-cd',
    label: 'CI/CD',
    accent: 'Automação',
    position: [2.6, 0, 1.2] as const,
    color: '#8b5cf6',
  },
  {
    slug: 'docker',
    label: 'Docker',
    accent: 'Containers',
    position: [-2.6, 0, -2.9] as const,
    color: '#0ea5e9',
  },
  {
    slug: 'observabilidade',
    label: 'Observabilidade',
    accent: 'Monitoramento',
    position: [3.2, 0, -2.8] as const,
    color: '#f59e0b',
  },
];

function RoomBlock({
  position,
  color,
  label,
  accent,
}: {
  position: readonly [number, number, number];
  color: string;
  label: string;
  accent: string;
}) {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow position={[0, 0.45, 0]}>
        <boxGeometry args={[2.6, 0.8, 2.6]} />
        <meshStandardMaterial color={color} roughness={0.8} metalness={0.1} />
      </mesh>

      <mesh castShadow position={[0, 1.05, 0]}>
        <boxGeometry args={[2.1, 0.14, 2.1]} />
        <meshStandardMaterial color="#f8fafc" transparent opacity={0.16} />
      </mesh>

      <mesh receiveShadow position={[0, 0.05, 0]}>
        <boxGeometry args={[2.9, 0.12, 2.9]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.95} />
      </mesh>

      <Html position={[0, 2.1, 0]} center distanceFactor={12}>
        <div className="r3f-billboard">
          <strong>{label}</strong>
          <span>{accent}</span>
        </div>
      </Html>
    </group>
  );
}

function BuildingScene() {
  return (
    <>
      <color attach="background" args={['#0b1020']} />
      <fog attach="fog" args={['#0b1020', 12, 30]} />

      <OrthographicCamera makeDefault position={[12, 12, 12]} zoom={52} near={0.1} far={100} />

      <ambientLight intensity={1.6} />
      <directionalLight
        castShadow
        intensity={1.4}
        position={[8, 12, 6]}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.12, 0]}>
        <planeGeometry args={[28, 28]} />
        <meshStandardMaterial color="#0f172a" roughness={1} />
      </mesh>

      <gridHelper args={[24, 24, '#60a5fa', '#1e293b']} position={[0, 0.01, 0]} />

      <group position={[0, 0.2, 0]}>
        {rooms.map((room) => (
          <RoomBlock
            key={room.slug}
            position={room.position}
            color={room.color}
            label={room.label}
            accent={room.accent}
          />
        ))}
      </group>

      <OrbitControls
        enablePan={false}
        enableRotate
        maxPolarAngle={Math.PI / 2.2}
        minPolarAngle={Math.PI / 3.5}
        minZoom={35}
        maxZoom={90}
        target={[0, 0.5, 0]}
      />
    </>
  );
}

export function WorldCanvas() {
  return (
    <div className="world-viewport" aria-label="Cenário 3D do prédio do mundo de aprendizado">
      <Suspense fallback={<div className="scene-loading">Carregando mundo...</div>}>
        <Canvas shadows dpr={[1, 2]}>
          <BuildingScene />
        </Canvas>
      </Suspense>
    </div>
  );
}
