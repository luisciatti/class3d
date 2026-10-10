import { describe, expect, it } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  it('creates a user and returns an access token for a first-time GitHub login', async () => {
    const service = new AuthService({
      user: {
        findFirst: async () => null,
        findUnique: async () => null,
        create: async (payload: { data: Record<string, unknown> }) => ({
          id: 'user-1',
          email: payload.data.email as string | null,
          name: payload.data.name as string | null,
          avatarUrl: payload.data.avatarUrl as string | null,
          provider: payload.data.provider as string | null,
          providerId: payload.data.providerId as string | null,
          refreshTokenHash: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        update: async ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => ({
          id: where.id,
          email: (data.email as string | null) ?? null,
          name: (data.name as string | null) ?? null,
          avatarUrl: (data.avatarUrl as string | null) ?? null,
          provider: (data.provider as string | null) ?? null,
          providerId: (data.providerId as string | null) ?? null,
          refreshTokenHash: (data.refreshTokenHash as string | null) ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      },
    } as unknown as PrismaService);

    const result = await service.loginWithProvider('github', {
      email: 'alex@example.com',
      name: 'Alex',
      avatarUrl: 'https://example.com/avatar.png',
      providerId: 'gh-123',
    });

    expect(result.user.email).toBe('alex@example.com');
    expect(result.accessToken).toBeTypeOf('string');
    expect(result.refreshToken).toBeTypeOf('string');
    expect(result.user.id).toBe('user-1');
  });

  it('returns the current user from a valid access token', async () => {
    const service = new AuthService({
      user: {
        findFirst: async () => ({
          id: 'user-1',
          email: 'alex@example.com',
          name: 'Alex',
          avatarUrl: 'https://example.com/avatar.png',
          provider: 'github',
          providerId: 'gh-123',
          refreshTokenHash: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        update: async ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => ({
          id: where.id,
          email: (data.email as string | null) ?? 'alex@example.com',
          name: (data.name as string | null) ?? 'Alex',
          avatarUrl: (data.avatarUrl as string | null) ?? 'https://example.com/avatar.png',
          provider: (data.provider as string | null) ?? 'github',
          providerId: (data.providerId as string | null) ?? 'gh-123',
          refreshTokenHash: (data.refreshTokenHash as string | null) ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        findUnique: async () => ({
          id: 'user-1',
          email: 'alex@example.com',
          name: 'Alex',
          avatarUrl: 'https://example.com/avatar.png',
          provider: 'github',
          providerId: 'gh-123',
          refreshTokenHash: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      },
    } as unknown as PrismaService);

    const session = await service.loginWithProvider('github', {
      email: 'alex@example.com',
      name: 'Alex',
      avatarUrl: 'https://example.com/avatar.png',
      providerId: 'gh-123',
    });

    const result = await service.getCurrentUserFromToken(session.accessToken);

    expect(result).toMatchObject({
      id: 'user-1',
      email: 'alex@example.com',
      name: 'Alex',
    });
  });
});
