'use client';

import { Html, OrbitControls, OrthographicCamera } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type JSX,
  type MutableRefObject,
} from 'react';
import { Group, Object3D, type InstancedMesh } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

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

const roomBounds = rooms.map((room) => {
  const [x, , z] = room.position;

  return {
    slug: room.slug,
    minX: x - 1.7,
    maxX: x + 1.7,
    minZ: z - 1.7,
    maxZ: z + 1.7,
  };
});

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

const WORLD_HALF_SIZE = 9;
const GRID_SIZE = 32;
const CELL_SIZE = (WORLD_HALF_SIZE * 2) / GRID_SIZE;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function isBlocked(x: number, z: number) {
  if (Math.abs(x) > WORLD_HALF_SIZE || Math.abs(z) > WORLD_HALF_SIZE) {
    return true;
  }

  return roomBounds.some(
    (room) => x >= room.minX && x <= room.maxX && z >= room.minZ && z <= room.maxZ,
  );
}

function toCell(value: number) {
  return Math.round((value + WORLD_HALF_SIZE) / CELL_SIZE);
}

function fromCell(cell: number) {
  return (cell - GRID_SIZE / 2) * CELL_SIZE;
}

function cellKey(x: number, z: number) {
  return `${x}:${z}`;
}

function findPath(start: [number, number], end: [number, number]) {
  const startCell = {
    x: clamp(toCell(start[0]), 0, GRID_SIZE - 1),
    z: clamp(toCell(start[1]), 0, GRID_SIZE - 1),
  };
  const endCell = {
    x: clamp(toCell(end[0]), 0, GRID_SIZE - 1),
    z: clamp(toCell(end[1]), 0, GRID_SIZE - 1),
  };

  if (
    isBlocked(fromCell(startCell.x), fromCell(startCell.z)) ||
    isBlocked(fromCell(endCell.x), fromCell(endCell.z))
  ) {
    return [] as Array<[number, number]>;
  }

  const open: Array<{ x: number; z: number; g: number; h: number; parent?: string | null }> = [
    { x: startCell.x, z: startCell.z, g: 0, h: 0 },
  ];
  const cameFrom = new Map<string, string | null>();
  const gScore = new Map<string, number>([[cellKey(startCell.x, startCell.z), 0]]);

  while (open.length > 0) {
    open.sort((a, b) => a.g + a.h - (b.g + b.h));
    const current = open.shift();

    if (!current) {
      break;
    }

    if (current.x === endCell.x && current.z === endCell.z) {
      const path: Array<[number, number]> = [];
      let cursor = cellKey(current.x, current.z);

      while (cursor) {
        const parts = cursor.split(':');
        const cx = Number(parts[0]);
        const cz = Number(parts[1]);

        if (!Number.isFinite(cx) || !Number.isFinite(cz)) {
          break;
        }

        path.unshift([fromCell(cx), fromCell(cz)]);
        const previous = cameFrom.get(cursor);
        cursor = previous ?? '';
      }

      return path;
    }

    const neighbors = [
      { x: current.x + 1, z: current.z },
      { x: current.x - 1, z: current.z },
      { x: current.x, z: current.z + 1 },
      { x: current.x, z: current.z - 1 },
      { x: current.x + 1, z: current.z + 1 },
      { x: current.x - 1, z: current.z - 1 },
      { x: current.x + 1, z: current.z - 1 },
      { x: current.x - 1, z: current.z + 1 },
    ];

    for (const neighbor of neighbors) {
      if (neighbor.x < 0 || neighbor.x >= GRID_SIZE || neighbor.z < 0 || neighbor.z >= GRID_SIZE) {
        continue;
      }

      const nextX = fromCell(neighbor.x);
      const nextZ = fromCell(neighbor.z);

      if (isBlocked(nextX, nextZ)) {
        continue;
      }

      const neighborKey = cellKey(neighbor.x, neighbor.z);
      const tentative = (gScore.get(cellKey(current.x, current.z)) ?? 0) + 1;

      if ((gScore.get(neighborKey) ?? Number.POSITIVE_INFINITY) <= tentative) {
        continue;
      }

      cameFrom.set(neighborKey, cellKey(current.x, current.z));
      gScore.set(neighborKey, tentative);
      const heuristic = Math.abs(neighbor.x - endCell.x) + Math.abs(neighbor.z - endCell.z);
      open.push({ x: neighbor.x, z: neighbor.z, g: tentative, h: heuristic });
    }
  }

  return [] as Array<[number, number]>;
}

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

function Avatar({
  controlsRef,
  targetRef,
}: {
  controlsRef: MutableRefObject<OrbitControlsImpl | null>;
  targetRef: MutableRefObject<[number, number, number] | null>;
}) {
  const avatarRef = useRef<Group>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const pathRef = useRef<Array<[number, number]>>([]);
  const currentRoomRef = useRef<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      keysRef.current[key] = true;
      targetRef.current = null;
      pathRef.current = [];
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      keysRef.current[key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [targetRef]);

  useFrame((state, delta) => {
    const avatar = avatarRef.current;
    if (!avatar) {
      return;
    }

    let moveX = 0;
    let moveZ = 0;

    if (keysRef.current['w'] || keysRef.current['arrowup']) {
      moveZ -= 1;
    }
    if (keysRef.current['s'] || keysRef.current['arrowdown']) {
      moveZ += 1;
    }
    if (keysRef.current['a'] || keysRef.current['arrowleft']) {
      moveX -= 1;
    }
    if (keysRef.current['d'] || keysRef.current['arrowright']) {
      moveX += 1;
    }

    const nextTarget = targetRef.current;
    if (nextTarget) {
      const start: [number, number] = [avatar.position.x, avatar.position.z];
      const goal: [number, number] = [nextTarget[0], nextTarget[2]];
      const nextPath = pathRef.current.length > 0 ? pathRef.current : findPath(start, goal);

      if (nextPath.length > 0) {
        pathRef.current = nextPath;
        const nextPoint = nextPath[0];

        if (!nextPoint) {
          targetRef.current = null;
          return;
        }

        const [nextX, nextZ] = nextPoint;
        const dx = nextX - avatar.position.x;
        const dz = nextZ - avatar.position.z;
        const length = Math.hypot(dx, dz) || 1;
        const step = Math.min(length, 2.6 * delta);

        const candidateX = avatar.position.x + (dx / length) * step;
        const candidateZ = avatar.position.z + (dz / length) * step;

        if (!isBlocked(candidateX, avatar.position.z)) {
          avatar.position.x = candidateX;
        }
        if (!isBlocked(avatar.position.x, candidateZ)) {
          avatar.position.z = candidateZ;
        }

        if (
          Math.abs(nextX - avatar.position.x) < 0.08 &&
          Math.abs(nextZ - avatar.position.z) < 0.08
        ) {
          pathRef.current = pathRef.current.slice(1);
          if (pathRef.current.length === 0) {
            targetRef.current = null;
          }
        }

        if (Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001) {
          avatar.rotation.y = Math.atan2(dx, dz);
        }
      } else {
        targetRef.current = null;
      }
    } else if (moveX !== 0 || moveZ !== 0) {
      const length = Math.hypot(moveX, moveZ) || 1;
      const speed = 2.2;
      const nextX = avatar.position.x + (moveX / length) * speed * delta;
      const nextZ = avatar.position.z + (moveZ / length) * speed * delta;

      if (!isBlocked(nextX, avatar.position.z)) {
        avatar.position.x = nextX;
      }
      if (!isBlocked(avatar.position.x, nextZ)) {
        avatar.position.z = nextZ;
      }

      avatar.rotation.y = Math.atan2(moveX, moveZ);
    }

    const activeRoom = roomBounds.find(
      (room) =>
        avatar.position.x >= room.minX &&
        avatar.position.x <= room.maxX &&
        avatar.position.z >= room.minZ &&
        avatar.position.z <= room.maxZ,
    );

    if (activeRoom) {
      if (activeRoom.slug !== currentRoomRef.current) {
        currentRoomRef.current = activeRoom.slug;
        window.dispatchEvent(
          new CustomEvent('room:enter', { detail: { roomSlug: activeRoom.slug } }),
        );
      }
    } else {
      currentRoomRef.current = null;
    }

    if (controlsRef.current) {
      controlsRef.current.target.set(avatar.position.x, 0.5, avatar.position.z);
      controlsRef.current.update();
    }
  });

  return (
    <group ref={avatarRef} position={[0, 0.22, 0]}>
      <mesh castShadow position={[0, 0.5, 0]}>
        <capsuleGeometry args={[0.32, 0.7, 4, 8]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0, 1.22, 0]}>
        <sphereGeometry args={[0.24, 16, 16]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.8} />
      </mesh>
      <mesh castShadow position={[0, 0.1, 0]}>
        <boxGeometry args={[0.46, 0.18, 0.32]} />
        <meshStandardMaterial color="#38bdf8" roughness={0.8} />
      </mesh>
    </group>
  );
}

function BuildingScene() {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const targetRef = useRef<[number, number, number] | null>(null);

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

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.08, 0]}
        onPointerDown={(event) => {
          event.stopPropagation();
          const point = event.point;
          const target: [number, number, number] = [
            clamp(point.x, -8, 8),
            0.25,
            clamp(point.z, -8, 8),
          ];

          if (!isBlocked(target[0], target[2])) {
            targetRef.current = target;
          }
        }}
      >
        <planeGeometry args={[16, 16]} />
        <meshStandardMaterial transparent opacity={0} />
      </mesh>

      <Avatar controlsRef={controlsRef} targetRef={targetRef} />

      <OrbitControls
        ref={controlsRef}
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
