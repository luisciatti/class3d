import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { ContentService } from './content.service';

describe('ContentService', () => {
  type RoomLike = {
    slug: string;
    title: string;
    prerequisites?: string[];
  };

  const prismaMock = {
    $connect: async () => undefined,
    $disconnect: async () => undefined,
    floor: {
      findMany: async () => [],
      findUnique: async () => undefined,
    },
    room: {
      findUnique: async () => undefined,
      findMany: async () => [],
    },
    lesson: {
      findUnique: async () => undefined,
      findMany: async () => [],
    },
    progress: {
      findMany: async () => [],
    },
  } as unknown as PrismaService;

  const service = new ContentService(prismaMock);

  it('marks a room as locked when its prerequisites are not completed', () => {
    const access = service.resolveRoomAccess(
      {
        slug: 'ci-cd',
        title: 'CI/CD',
        prerequisites: ['git'],
      } as RoomLike,
      new Set<string>(),
    );

    expect(access.unlocked).toBe(false);
    expect(access.reason).toBe('Prerequisite not completed');
  });

  it('marks a room as unlocked when its prerequisites are completed', () => {
    const access = service.resolveRoomAccess(
      {
        slug: 'docker',
        title: 'Docker',
        prerequisites: ['git', 'ci-cd'],
      } as RoomLike,
      new Set(['git', 'ci-cd']),
    );

    expect(access.unlocked).toBe(true);
    expect(access.reason).toBeUndefined();
  });

  it('throws a not found error for a missing room slug', async () => {
    await expect(service.getRoomBySlug('missing-room')).rejects.toThrow(NotFoundException);
  });
});
