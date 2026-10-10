'use client';

import { Html, OrbitControls, OrthographicCamera } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Suspense, useLayoutEffect, useMemo, useRef, type JSX } from 'react';
import { Object3D, type InstancedMesh } from 'three';

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
] as const;

const deskPositions = [
  [-0.8, 0.9, 0.55],
  [0.8, 0.9, 0.55],
  [0.8, 0.9, -0.85],
  [-0.8, 0.9, -0.85],
] as const;

const chairPositions = [
  [-1.5, 0.42, 0.45],
  [1.5, 0.42, 0.45],
  [1.5, 0.42, -1.2],
  [-1.5, 0.42, -1.2],
] as const;

function DeskCluster() {
  const ref = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);

  useLayoutEffect(() => {
    if (!ref.current) {
      return;
    }

    deskPositions.forEach((position, index) => {
      dummy.position.set(position[0], position[1], position[2]);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      ref.current!.setMatrixAt(index, dummy.matrix);
    });

    ref.current.instanceMatrix.needsUpdate = true;
  }, [dummy]);

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, deskPositions.length]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[0.8, 0.12, 0.5]} />
      <meshStandardMaterial color="#d97706" roughness={0.8} metalness={0.1} />
    </instancedMesh>
  );
}

function ChairCluster() {
  const ref = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);

  useLayoutEffect(() => {
    if (!ref.current) {
      return;
    }

    chairPositions.forEach((position, index) => {
      dummy.position.set(position[0], position[1], position[2]);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      ref.current!.setMatrixAt(index, dummy.matrix);
    });

    ref.current.instanceMatrix.needsUpdate = true;
  }, [dummy]);

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, chairPositions.length]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[0.45, 0.18, 0.45]} />
      <meshStandardMaterial color="#bfdbfe" roughness={0.9} />
    </instancedMesh>
  );
}

function Plant({ position }: { position: readonly [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.25, 0.3, 0.3, 12]} />
        <meshStandardMaterial color="#4b5563" />
      </mesh>
      <mesh castShadow position={[0, 0.7, 0]}>
        <sphereGeometry args={[0.4, 10, 10]} />
        <meshStandardMaterial color="#22c55e" roughness={0.95} />
      </mesh>
    </group>
  );
}

function Bookshelf({ position }: { position: readonly [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[0.7, 0.9, 0.3]} />
        <meshStandardMaterial color="#a16207" roughness={0.8} />
      </mesh>
      <mesh castShadow position={[0, 0.18, 0.12]}>
        <boxGeometry args={[0.65, 0.08, 0.12]} />
        <meshStandardMaterial color="#fef3c7" />
      </mesh>
      <mesh castShadow position={[0, 0.45, 0.12]}>
        <boxGeometry args={[0.65, 0.08, 0.12]} />
        <meshStandardMaterial color="#fef3c7" />
      </mesh>
      <mesh castShadow position={[0, 0.72, 0.12]}>
        <boxGeometry args={[0.65, 0.08, 0.12]} />
        <meshStandardMaterial color="#fef3c7" />
      </mesh>
    </group>
  );
}

function Sofa({ position }: { position: readonly [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow position={[0, 0.22, 0]}>
        <boxGeometry args={[1.25, 0.35, 0.7]} />
        <meshStandardMaterial color="#a78bfa" roughness={0.8} />
      </mesh>
      <mesh castShadow position={[0, 0.52, -0.18]}>
        <boxGeometry args={[1.15, 0.4, 0.12]} />
        <meshStandardMaterial color="#c4b5fd" roughness={0.8} />
      </mesh>
      <mesh castShadow position={[-0.52, 0.18, 0]}>
        <boxGeometry args={[0.1, 0.42, 0.7]} />
        <meshStandardMaterial color="#c4b5fd" roughness={0.8} />
      </mesh>
      <mesh castShadow position={[0.52, 0.18, 0]}>
        <boxGeometry args={[0.1, 0.42, 0.7]} />
        <meshStandardMaterial color="#c4b5fd" roughness={0.8} />
      </mesh>
    </group>
  );
}

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

      <mesh castShadow receiveShadow position={[0, 0.1, 0]}>
        <boxGeometry args={[2.9, 0.12, 2.9]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.95} />
      </mesh>

      <mesh castShadow position={[-0.45, 0.35, 1.25]}>
        <boxGeometry args={[0.8, 0.7, 0.12]} />
        <meshStandardMaterial color="#f8fafc" transparent opacity={0.18} />
      </mesh>

      <mesh castShadow position={[1.1, 0.45, 1.18]}>
        <boxGeometry args={[0.32, 0.6, 0.08]} />
        <meshStandardMaterial color="#dbeafe" />
      </mesh>

      <DeskCluster />
      <ChairCluster />
      <Plant position={[-1.2, 0.2, -1.1]} />
      <Bookshelf position={[1.15, 0.1, -0.9]} />
      <Sofa position={[-0.2, 0.1, 0.95]} />

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

export function WorldCanvas(): JSX.Element {
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
