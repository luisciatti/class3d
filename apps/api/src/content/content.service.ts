import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';
import { PrismaService } from '../prisma/prisma.service';

export type RoomAccessState = {
  unlocked: boolean;
  reason?: string;
};

export type RoomAccessSource = {
  prerequisites?: string[];
};

@Injectable()
export class ContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService?: ConfigService,
  ) {}

  resolveRoomAccess(room: RoomAccessSource, completedRoomSlugs: Set<string>): RoomAccessState {
    const prerequisites = room.prerequisites ?? [];

    if (prerequisites.length === 0) {
      return { unlocked: true };
    }

    const missingPrerequisites = prerequisites.filter(
      (prerequisite) => !completedRoomSlugs.has(prerequisite),
    );

    if (missingPrerequisites.length > 0) {
      return {
        unlocked: false,
        reason: 'Prerequisite not completed',
        // retained for future UI messaging
      };
    }

    return { unlocked: true };
  }

  async getCompletedRoomSlugs(userId?: string): Promise<Set<string>> {
    if (!userId) {
      return new Set<string>();
    }

    const progress = await this.prisma.progress.findMany({
      where: { userId, status: 'COMPLETED' },
      include: { lesson: { select: { roomId: true } } },
    });

    const roomIds = Array.from(new Set(progress.map((entry) => entry.lesson.roomId)));

    if (roomIds.length === 0) {
      return new Set<string>();
    }

    const rooms = await this.prisma.room.findMany({
      where: { id: { in: roomIds } },
      select: { slug: true },
    });

    return new Set(rooms.map((room) => room.slug));
  }

  async getFloors(userId?: string) {
    const cacheKey = `content:floors:${userId ?? 'anonymous'}`;
    const cached = await this.readCache<unknown[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const floors = await this.prisma.floor.findMany({
      orderBy: { order: 'asc' },
      include: {
        rooms: {
          orderBy: { title: 'asc' },
          include: {
            lessons: { orderBy: { order: 'asc' } },
          },
        },
      },
    });

    const completedRooms = await this.getCompletedRoomSlugs(userId);
    const result = floors.map((floor) => ({
      ...floor,
      rooms: floor.rooms.map((room) => ({
        ...room,
        unlocked: this.resolveRoomAccess(room, completedRooms).unlocked,
        lockedReason: this.resolveRoomAccess(room, completedRooms).reason ?? null,
      })),
    }));

    await this.writeCache(cacheKey, result, 300);
    return result;
  }

  async getFloorBySlug(slug: string, userId?: string) {
    const cacheKey = `content:floor:${slug}:${userId ?? 'anonymous'}`;
    const cached = await this.readCache<Record<string, unknown>>(cacheKey);

    if (cached) {
      return cached;
    }

    const floor = await this.prisma.floor.findUnique({
      where: { slug },
      include: {
        rooms: {
          orderBy: { title: 'asc' },
          include: { lessons: { orderBy: { order: 'asc' } } },
        },
      },
    });

    if (!floor) {
      throw new NotFoundException(`Floor ${slug} not found`);
    }

    const completedRooms = await this.getCompletedRoomSlugs(userId);
    const result = {
      ...floor,
      rooms: floor.rooms.map((room) => ({
        ...room,
        unlocked: this.resolveRoomAccess(room, completedRooms).unlocked,
        lockedReason: this.resolveRoomAccess(room, completedRooms).reason ?? null,
      })),
    };

    await this.writeCache(cacheKey, result, 300);
    return result;
  }

  async getRoomBySlug(slug: string, userId?: string) {
    const room = await this.prisma.room.findUnique({
      where: { slug },
      include: {
        lessons: { orderBy: { order: 'asc' } },
        floor: true,
      },
    });

    if (!room) {
      throw new NotFoundException(`Room ${slug} not found`);
    }

    const completedRooms = await this.getCompletedRoomSlugs(userId);
    const access = this.resolveRoomAccess(room, completedRooms);

    return {
      ...room,
      unlocked: access.unlocked,
      lockedReason: access.reason ?? null,
      lessons: room.lessons.map((lesson) => ({
        ...lesson,
        unlocked: access.unlocked,
      })),
    };
  }

  async getRoomLessons(slug: string, userId?: string) {
    const room = await this.prisma.room.findUnique({
      where: { slug },
      include: { lessons: { orderBy: { order: 'asc' } } },
    });

    if (!room) {
      throw new NotFoundException(`Room ${slug} not found`);
    }

    const completedRooms = await this.getCompletedRoomSlugs(userId);
    const access = this.resolveRoomAccess(room, completedRooms);

    return {
      room: {
        slug: room.slug,
        title: room.title,
        unlocked: access.unlocked,
        lockedReason: access.reason ?? null,
      },
      lessons: room.lessons.map((lesson) => ({
        ...lesson,
        unlocked: access.unlocked,
      })),
    };
  }

  async getLessonBySlug(slug: string, userId?: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { slug },
      include: { room: { include: { lessons: { orderBy: { order: 'asc' } } } } },
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson ${slug} not found`);
    }

    const completedRooms = await this.getCompletedRoomSlugs(userId);
    const roomAccess = this.resolveRoomAccess(lesson.room, completedRooms);

    return {
      ...lesson,
      unlocked: roomAccess.unlocked,
      lockedReason: roomAccess.reason ?? null,
    };
  }

  private async readCache<T>(key: string): Promise<T | undefined> {
    const client = await this.getRedisClient();

    if (!client) {
      return undefined;
    }

    try {
      const value = await client.get(key);
      return value ? (JSON.parse(value) as T) : undefined;
    } catch {
      return undefined;
    } finally {
      await client.quit().catch(() => undefined);
    }
  }

  private async writeCache<T>(key: string, value: T, ttlInSeconds: number): Promise<void> {
    const client = await this.getRedisClient();

    if (!client) {
      return;
    }

    try {
      await client.set(key, JSON.stringify(value), { EX: ttlInSeconds });
    } catch {
      // ignore cache failures and continue with the response
    } finally {
      await client.quit().catch(() => undefined);
    }
  }

  private async getRedisClient(): Promise<ReturnType<typeof createClient> | null> {
    const redisUrl = this.configService?.get<string>('REDIS_URL');

    if (!redisUrl) {
      return null;
    }

    try {
      const client = createClient({ url: redisUrl });
      await client.connect();
      return client;
    } catch {
      return null;
    }
  }
}
