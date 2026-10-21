'use client';

import { Bounds, Html, OrbitControls } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef, type JSX, type MutableRefObject } from 'react';
import { Group } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { FurnitureModelKey } from '../lib/models';

export type WorldRoomState = {
  slug: string;
  label: string;
  accent: string;
  position: readonly [number, number, number];
  color: string;
  unlocked: boolean;
  lockedReason?: string | null;
};

type RoomLayout = {
  slug: string;
  label: string;
  color: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  accent: string;
  unlocked: boolean;
  lockedReason?: string | null;
};

export const defaultRoomStates: ReadonlyArray<WorldRoomState> = [
  {
    slug: 'git',
    label: 'Git',
    accent: 'Fundamentos',
    position: [-6.5, 0, 3.4] as const,
    color: '#1fae8c',
    unlocked: true,
    lockedReason: null,
  },
  {
    slug: 'ci-cd',
    label: 'CI/CD',
    accent: 'Automação',
    position: [2.8, 0, 3.2] as const,
    color: '#9f8be0',
    unlocked: true,
    lockedReason: null,
  },
  {
    slug: 'docker',
    label: 'Docker',
    accent: 'Containers',
    position: [-5.6, 0, -5.9] as const,
    color: '#1fae8c',
    unlocked: false,
    lockedReason: 'Conclua CI/CD para liberar esta sala.',
  },
  {
    slug: 'observabilidade',
    label: 'Observabilidade',
    accent: 'Monitoramento',
    position: [5.6, 0, -5.7] as const,
    color: '#9f8be0',
    unlocked: false,
    lockedReason: 'Conclua Docker para liberar esta sala.',
  },
];

const ROOM_LAYOUTS: RoomLayout[] = [
  {
    slug: 'git',
    label: 'Git',
    color: '#19af8d',
    x: -7.2,
    z: 4.3,
    width: 8,
    depth: 8,
    accent: 'Fundamentos',
    unlocked: true,
  },
  {
    slug: 'ci-cd',
    label: 'CI/CD',
    color: '#9a8ae6',
    x: 2.4,
    z: 4.5,
    width: 10,
    depth: 8,
    accent: 'Automação',
    unlocked: true,
  },
  {
    slug: 'docker',
    label: 'Docker',
    color: '#1fae8c',
    x: -6.3,
    z: -6.1,
    width: 9,
    depth: 8,
    accent: 'Containers',
    unlocked: false,
  },
  {
    slug: 'observabilidade',
    label: 'Observabilidade',
    color: '#8f7de0',
    x: 5.8,
    z: -6.1,
    width: 8,
    depth: 8,
    accent: 'Monitoramento',
    unlocked: false,
  },
];

const roomBounds = ROOM_LAYOUTS.map((room) => ({
  slug: room.slug,
  minX: room.x - room.width / 2,
  maxX: room.x + room.width / 2,
  minZ: room.z - room.depth / 2,
  maxZ: room.z + room.depth / 2,
}));

const WORLD_HALF_SIZE = 18;
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

  const open: Array<{ x: number; z: number; g: number; h: number }> = [
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

function FurniturePiece({
  kind,
  position,
  rotation = [0, 0, 0],
  scale = 1,
  color = '#d9b37a',
}: {
  kind: FurnitureModelKey;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  color?: string;
}) {
  const commonScale = scale;

  if (kind === 'desk') {
    return (
      <group position={position} rotation={rotation} scale={commonScale}>
        <mesh castShadow receiveShadow position={[0, 0.4, 0]}>
          <boxGeometry args={[1.4, 0.12, 0.7]} />
          <meshStandardMaterial color={color} roughness={0.85} />
        </mesh>
        <mesh castShadow receiveShadow position={[0, 0.1, 0.25]}>
          <boxGeometry args={[1.1, 0.18, 0.12]} />
          <meshStandardMaterial color="#2d3748" roughness={0.75} />
        </mesh>
      </group>
    );
  }

  if (kind === 'chairDesk') {
    return (
      <group position={position} rotation={rotation} scale={commonScale}>
        <mesh castShadow position={[0, 0.28, 0]}>
          <boxGeometry args={[0.5, 0.18, 0.5]} />
          <meshStandardMaterial color="#dfe4ee" roughness={0.8} />
        </mesh>
        <mesh castShadow position={[0, 0.58, -0.12]}>
          <boxGeometry args={[0.4, 0.55, 0.12]} />
          <meshStandardMaterial color="#dfe4ee" roughness={0.8} />
        </mesh>
      </group>
    );
  }

  if (kind === 'computerScreen') {
    return (
      <group position={position} rotation={rotation} scale={commonScale}>
        <mesh castShadow position={[0, 0.4, 0]}>
          <boxGeometry args={[0.55, 0.35, 0.08]} />
          <meshStandardMaterial color={color} emissive="#1d4ed8" emissiveIntensity={0.2} />
        </mesh>
        <mesh castShadow position={[0, 0.05, 0.12]}>
          <boxGeometry args={[0.5, 0.08, 0.2]} />
          <meshStandardMaterial color="#1f2937" roughness={0.7} />
        </mesh>
      </group>
    );
  }

  if (kind === 'computerKeyboard') {
    return (
      <group position={position} rotation={rotation} scale={commonScale}>
        <mesh castShadow position={[0, 0.06, 0]}>
          <boxGeometry args={[0.5, 0.05, 0.18]} />
          <meshStandardMaterial color={color} roughness={0.75} />
        </mesh>
      </group>
    );
  }

  if (kind === 'tableCoffee') {
    return (
      <group position={position} rotation={rotation} scale={commonScale}>
        <mesh castShadow receiveShadow position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.55, 0.65, 0.18, 14]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
        <mesh castShadow receiveShadow position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.08, 0.1, 0.4, 14]} />
          <meshStandardMaterial color="#8b5e3c" roughness={0.7} />
        </mesh>
      </group>
    );
  }

  if (kind === 'pillow') {
    return (
      <group position={position} rotation={rotation} scale={commonScale}>
        <mesh castShadow receiveShadow position={[0, 0.16, 0]}>
          <boxGeometry args={[0.5, 0.1, 0.4]} />
          <meshStandardMaterial color={color} roughness={0.82} />
        </mesh>
      </group>
    );
  }

  if (kind === 'loungeChair') {
    return (
      <group position={position} rotation={rotation} scale={commonScale}>
        <mesh castShadow position={[0, 0.35, 0]}>
          <boxGeometry args={[0.7, 0.38, 0.72]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
        <mesh castShadow position={[0, 0.72, -0.15]}>
          <boxGeometry args={[0.62, 0.5, 0.12]} />
          <meshStandardMaterial color="#f6d3a4" roughness={0.7} />
        </mesh>
      </group>
    );
  }

  if (kind === 'plantSmall2') {
    return (
      <group position={position} rotation={rotation} scale={commonScale}>
        <mesh castShadow position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.2, 0.25, 0.35, 12]} />
          <meshStandardMaterial color="#4b5563" roughness={0.9} />
        </mesh>
        <mesh castShadow position={[0, 0.7, 0]}>
          <sphereGeometry args={[0.38, 12, 12]} />
          <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
      </group>
    );
  }

  return (
    <group position={position} rotation={rotation} scale={commonScale}>
      <mesh castShadow position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.18, 0.22, 0.8, 18]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh castShadow position={[0, 1.1, 0]}>
        <sphereGeometry args={[0.18, 12, 12]} />
        <meshStandardMaterial color="#fef3c7" emissive="#fbbf24" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

function RoomBlock({ layout, unlocked }: { layout: RoomLayout; unlocked: boolean }) {
  const accentTone = unlocked ? '#f8fafc' : '#dfe7ef';

  return (
    <group position={[layout.x, 0, layout.z]}>
      <mesh castShadow receiveShadow position={[0, 0.18, 0]}>
        <boxGeometry args={[layout.width, 0.18, layout.depth]} />
        <meshStandardMaterial color={layout.color} roughness={0.9} metalness={0.12} />
      </mesh>

      <mesh castShadow receiveShadow position={[0, 0.54, 0]}>
        <boxGeometry args={[layout.width - 0.28, 0.08, layout.depth - 0.28]} />
        <meshStandardMaterial color="#f7f3ee" roughness={0.7} />
      </mesh>

      <mesh castShadow receiveShadow position={[-layout.width / 2 + 0.16, 0.72, 0]}>
        <boxGeometry args={[0.18, 1.5, layout.depth]} />
        <meshStandardMaterial color="#f3f0f4" roughness={0.75} />
      </mesh>

      <mesh castShadow receiveShadow position={[0, 0.72, -layout.depth / 2 + 0.16]}>
        <boxGeometry args={[layout.width, 1.5, 0.18]} />
        <meshStandardMaterial color="#f3f0f4" roughness={0.75} />
      </mesh>

      <mesh castShadow receiveShadow position={[layout.width / 2 - 0.16, 0.42, 0]}>
        <boxGeometry args={[0.18, 0.84, layout.depth * 0.58]} />
        <meshStandardMaterial color="#f3f0f4" roughness={0.7} />
      </mesh>

      <mesh position={[0, 0.1, layout.depth / 2 - 0.12]}>
        <boxGeometry args={[2.4, 0.06, 0.14]} />
        <meshStandardMaterial color={accentTone} roughness={0.7} />
      </mesh>

      <mesh position={[0, 0.14, layout.depth / 2 - 0.66]}>
        <boxGeometry args={[1.25, 0.12, 0.12]} />
        <meshStandardMaterial color={unlocked ? '#5eead4' : '#cbd5e1'} roughness={0.6} />
      </mesh>

      <Html position={[0, 1.95, 0.15]} center distanceFactor={12}>
        <div
          style={{
            background: '#0f1b24',
            color: '#fff',
            padding: '8px 12px',
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.14)',
            fontSize: '12px',
            fontWeight: 700,
            minWidth: '120px',
            textAlign: 'center',
            whiteSpace: 'nowrap',
            boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
          }}
        >
          <div>{layout.label}</div>
          <div style={{ opacity: 0.8, fontSize: '10px', marginTop: 2 }}>
            {unlocked ? 'Disponível' : 'Bloqueada'}
          </div>
        </div>
      </Html>

      <FurniturePiece kind="desk" position={[-1.2, 0.42, -1.2]} scale={0.82} color="#d7b582" />
      <FurniturePiece kind="chairDesk" position={[-1.55, 0.2, 0.7]} scale={0.9} color="#d5d7dc" />
      <FurniturePiece
        kind="computerScreen"
        position={[-0.8, 0.82, -1.2]}
        scale={0.8}
        color="#9bb5ff"
      />
      <FurniturePiece kind="tableCoffee" position={[1.5, 0.2, 1.2]} scale={0.72} color="#d7b582" />
      <FurniturePiece kind="loungeChair" position={[2.3, 0.2, -1.2]} scale={0.7} color="#dba46d" />
      <FurniturePiece kind="plantSmall2" position={[-2.7, 0.14, 2.2]} scale={1.1} color="#5f9e5a" />
      <FurniturePiece
        kind="lampRoundFloor"
        position={[2.7, 0.15, 2.2]}
        scale={0.72}
        color="#f3d7a1"
      />
    </group>
  );
}

function Avatar({
  controlsRef,
  targetRef,
  onRoomEnter,
}: {
  controlsRef: MutableRefObject<OrbitControlsImpl | null>;
  targetRef: MutableRefObject<[number, number, number] | null>;
  onRoomEnter?: (roomSlug: string) => void;
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
      keysRef.current[event.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [targetRef]);

  useFrame((_, delta) => {
    const avatar = avatarRef.current;
    if (!avatar) {
      return;
    }

    let moveX = 0;
    let moveZ = 0;

    if (keysRef.current['w'] || keysRef.current['arrowup']) moveZ -= 1;
    if (keysRef.current['s'] || keysRef.current['arrowdown']) moveZ += 1;
    if (keysRef.current['a'] || keysRef.current['arrowleft']) moveX -= 1;
    if (keysRef.current['d'] || keysRef.current['arrowright']) moveX += 1;

    const target = targetRef.current;
    if (target) {
      const start: [number, number] = [avatar.position.x, avatar.position.z];
      const goal: [number, number] = [target[0], target[2]];
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
        const step = Math.min(length, 2.8 * delta);

        const candidateX = avatar.position.x + (dx / length) * step;
        const candidateZ = avatar.position.z + (dz / length) * step;

        if (!isBlocked(candidateX, avatar.position.z)) avatar.position.x = candidateX;
        if (!isBlocked(avatar.position.x, candidateZ)) avatar.position.z = candidateZ;

        if (
          Math.abs(nextX - avatar.position.x) < 0.08 &&
          Math.abs(nextZ - avatar.position.z) < 0.08
        ) {
          pathRef.current = pathRef.current.slice(1);
          if (pathRef.current.length === 0) {
            targetRef.current = null;
          }
        }

        avatar.rotation.y = Math.atan2(dx, dz);
      } else {
        targetRef.current = null;
      }
    } else if (moveX !== 0 || moveZ !== 0) {
      const length = Math.hypot(moveX, moveZ) || 1;
      const speed = 2.3;
      const nextX = avatar.position.x + (moveX / length) * speed * delta;
      const nextZ = avatar.position.z + (moveZ / length) * speed * delta;

      if (!isBlocked(nextX, avatar.position.z)) avatar.position.x = nextX;
      if (!isBlocked(avatar.position.x, nextZ)) avatar.position.z = nextZ;
      avatar.rotation.y = Math.atan2(moveX, moveZ);
    }

    const roomHit = roomBounds.find(
      (room) =>
        avatar.position.x >= room.minX &&
        avatar.position.x <= room.maxX &&
        avatar.position.z >= room.minZ &&
        avatar.position.z <= room.maxZ,
    );

    if (roomHit) {
      if (roomHit.slug !== currentRoomRef.current) {
        currentRoomRef.current = roomHit.slug;
        onRoomEnter?.(roomHit.slug);
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
    <group ref={avatarRef} position={[0, 0.2, 0]}>
      <mesh castShadow position={[0, 0.42, 0]}>
        <capsuleGeometry args={[0.26, 0.7, 6, 12]} />
        <meshStandardMaterial color="#f97316" roughness={0.8} />
      </mesh>
      <mesh castShadow position={[0, 1.02, 0]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color="#f4d7a6" roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.7, 32]} />
        <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={0.2} />
      </mesh>
    </group>
  );
}

function BuildingScene({
  floorSlug = 'devops',
  roomStates = defaultRoomStates,
  onRoomEnter,
}: {
  floorSlug?: string;
  roomStates?: ReadonlyArray<WorldRoomState>;
  onRoomEnter?: (roomSlug: string) => void;
}) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const targetRef = useRef<[number, number, number] | null>(null);
  const sceneTone = floorSlug === 'backend' ? '#171b25' : '#2d2c3b';
  const floorTone = floorSlug === 'backend' ? '#1d2430' : '#e9d8b8';

  const layoutMap = useMemo(() => new Map(ROOM_LAYOUTS.map((layout) => [layout.slug, layout])), []);

  return (
    <>
      <color attach="background" args={[sceneTone]} />

      <ambientLight intensity={1.25} />
      <hemisphereLight args={['#f7f8ff', '#2d2c3b', 0.9]} />
      <directionalLight
        castShadow
        position={[10, 18, 10]}
        intensity={1.35}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.16, 0]}>
        <planeGeometry args={[48, 36]} />
        <meshStandardMaterial color="#2d2c3b" roughness={1} />
      </mesh>

      <mesh castShadow receiveShadow position={[0, 0.12, 0]}>
        <boxGeometry args={[30, 0.35, 22]} />
        <meshStandardMaterial color={floorTone} roughness={0.92} />
      </mesh>

      <mesh castShadow receiveShadow position={[0, 0.32, 0]}>
        <boxGeometry args={[19, 0.1, 15]} />
        <meshStandardMaterial color="#f7efe5" roughness={0.8} />
      </mesh>

      <mesh position={[0, 0.18, 9.2]}>
        <boxGeometry args={[20, 0.08, 1.7]} />
        <meshStandardMaterial color="#d8cebf" roughness={0.9} />
      </mesh>

      <mesh position={[0, 0.26, 10.2]}>
        <boxGeometry args={[5, 0.12, 0.9]} />
        <meshStandardMaterial color="#f0f9ff" roughness={0.65} />
      </mesh>

      <mesh receiveShadow position={[-14.9, 0.8, 0]}>
        <boxGeometry args={[0.4, 1.6, 22]} />
        <meshStandardMaterial color="#f3f0f4" roughness={0.7} />
      </mesh>

      <mesh receiveShadow position={[0, 0.8, -10.9]}>
        <boxGeometry args={[30, 1.6, 0.4]} />
        <meshStandardMaterial color="#f3f0f4" roughness={0.7} />
      </mesh>

      <mesh castShadow receiveShadow position={[0, 0.2, 0]}>
        <boxGeometry args={[2.8, 0.16, 2.8]} />
        <meshStandardMaterial color="#d9dccd" roughness={0.9} />
      </mesh>

      {[-11.5, -7.5, -3.5, 0.5, 4.5, 8.5].map((x) => (
        <group key={x} position={[x, 0.55, 10.7]}>
          <mesh castShadow receiveShadow position={[0, 0.7, 0]}>
            <cylinderGeometry args={[0.18, 0.18, 1.4, 16]} />
            <meshStandardMaterial color="#f3f0f4" roughness={0.7} />
          </mesh>
          <mesh position={[0, 1.25, 0]}>
            <boxGeometry args={[0.8, 0.12, 0.8]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.75} />
          </mesh>
        </group>
      ))}

      {[-12, 12].map((x) => (
        <group key={x} position={[x, 0.15, -9.7]}>
          <mesh castShadow position={[0, 0.26, 0]}>
            <boxGeometry args={[1.6, 0.2, 1.2]} />
            <meshStandardMaterial color="#d7ebd8" roughness={0.85} />
          </mesh>
          <mesh castShadow position={[0, 0.72, 0]}>
            <sphereGeometry args={[0.58, 12, 12]} />
            <meshStandardMaterial color="#67b86c" roughness={0.9} />
          </mesh>
        </group>
      ))}

      <Html position={[0, 2.2, 10.7]} center distanceFactor={12}>
        <div
          style={{
            background: 'rgba(7, 16, 26, 0.9)',
            border: '1px solid rgba(160, 200, 255, 0.3)',
            borderRadius: 14,
            padding: '8px 14px',
            color: '#edf6ff',
            fontSize: '12px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontWeight: 800,
            boxShadow: '0 18px 28px rgba(15, 23, 42, 0.28)',
          }}
        >
          Mundo de Aprendizado
        </div>
      </Html>

      <Bounds fit clip observe margin={1.15}>
        <group position={[-0.1, 0, 0]}>
          {roomStates.map((roomState) => {
            const layout = layoutMap.get(roomState.slug) ?? {
              slug: roomState.slug,
              label: roomState.label,
              color: roomState.color,
              x: roomState.position[0],
              z: roomState.position[2],
              width: 8,
              depth: 8,
              accent: roomState.accent,
              unlocked: roomState.unlocked,
            };

            return (
              <RoomBlock
                key={roomState.slug}
                layout={{ ...layout, color: roomState.color, label: roomState.label }}
                unlocked={roomState.unlocked}
              />
            );
          })}
        </group>
      </Bounds>

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.05, 0]}
        onPointerDown={(event) => {
          event.stopPropagation();
          const target: [number, number, number] = [
            clamp(event.point.x, -13, 13),
            0.2,
            clamp(event.point.z, -10, 10),
          ];
          if (!isBlocked(target[0], target[2])) {
            targetRef.current = target;
          }
        }}
      >
        <planeGeometry args={[27, 19]} />
        <meshStandardMaterial color="#2d2c3b" emissive="#2d2c3b" emissiveIntensity={0.1} />
      </mesh>

      <Avatar controlsRef={controlsRef} targetRef={targetRef} onRoomEnter={onRoomEnter} />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan={false}
        enableRotate
        maxPolarAngle={Math.PI / 2.2}
        minPolarAngle={Math.PI / 3.4}
        minZoom={34}
        maxZoom={80}
        target={[0, 0.5, 0]}
      />
    </>
  );
}

export function WorldCanvas({
  floorSlug = 'devops',
  roomStates = defaultRoomStates,
  onRoomEnter,
}: {
  floorSlug?: string;
  roomStates?: ReadonlyArray<WorldRoomState>;
  onRoomEnter?: (roomSlug: string) => void;
}): JSX.Element {
  return (
    <div className="world-viewport" aria-label="Cenário 3D do prédio do mundo de aprendizado">
      <Suspense fallback={<div className="scene-loading">Carregando mundo...</div>}>
        <Canvas
          key={floorSlug}
          shadows
          dpr={[1, 1.75]}
          camera={{ position: [18, 12, 18], fov: 38, near: 0.1, far: 120 }}
        >
          <BuildingScene floorSlug={floorSlug} roomStates={roomStates} onRoomEnter={onRoomEnter} />
        </Canvas>
      </Suspense>
    </div>
  );
}
