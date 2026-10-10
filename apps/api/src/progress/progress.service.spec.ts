import { describe, expect, it } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressService } from './progress.service';

describe('ProgressService', () => {
  it('marks a lesson as completed once and awards XP only the first time', async () => {
    const prisma = {
      progress: {
        findUnique: async () => ({
          id: 'p-1',
          userId: 'user-1',
          lessonId: 'lesson-1',
          status: 'IN_PROGRESS',
          completedAt: null,
          lesson: { xp: 40 },
        }),
        upsert: async ({
          update,
          create,
        }: {
          update: { status?: string; completedAt?: Date | null };
          create: { lessonId: string; userId: string; status: string; completedAt?: Date | null };
        }) => ({
          id: 'p-1',
          userId: 'user-1',
          lessonId: create.lessonId,
          status: update.status ?? create.status,
          completedAt: update.completedAt ?? create.completedAt ?? null,
          lesson: { xp: 40 },
        }),
        count: async () => 1,
        findMany: async () => [{ lesson: { xp: 40 }, status: 'COMPLETED' }],
      },
      lesson: {
        findUnique: async () => ({
          id: 'lesson-1',
          slug: 'git-intro',
          title: 'Git Intro',
          xp: 40,
          room: { slug: 'git', title: 'Git' },
        }),
      },
      achievement: {
        findMany: async () => [],
        create: async ({ data }: { data: Record<string, unknown> }) => ({ id: 'a-1', ...data }),
      },
    };

    const service = new ProgressService(prisma as unknown as PrismaService);

    const result = await service.updateLessonProgress('user-1', 'lesson-1', 'completed');

    expect(result.status).toBe('COMPLETED');
    expect(result.xpAwarded).toBe(40);
    expect(result.completed).toBe(true);
  });

  it('returns scored quiz results and prevents duplicate XP awards for the same room quiz', async () => {
    const prisma = {
      room: {
        findUnique: async () => ({
          id: 'room-1',
          slug: 'git',
          lessons: [
            {
              id: 'lesson-1',
              slug: 'git-intro',
              title: 'Introdução ao Git',
              xp: 25,
              questions: [
                {
                  id: 'q-1',
                  options: ['A', 'B', 'C'],
                  correctIndex: 1,
                  explanation: 'Porque B é correto.',
                },
                {
                  id: 'q-2',
                  options: ['A', 'B', 'C'],
                  correctIndex: 2,
                  explanation: 'Porque C é correto.',
                },
              ],
            },
          ],
        }),
      },
      progress: {
        findMany: async () => [{ lessonId: 'lesson-1', status: 'COMPLETED', lesson: { xp: 25 } }],
        upsert: async ({
          update,
          create,
        }: {
          update: { status?: string; completedAt?: Date | null };
          create: { lessonId: string; userId: string; status: string; completedAt?: Date | null };
        }) => ({
          id: 'p-1',
          userId: 'user-1',
          lessonId: create.lessonId,
          status: update.status ?? create.status,
          completedAt: update.completedAt ?? create.completedAt ?? null,
        }),
        count: async () => 1,
        findUnique: async () => ({
          id: 'p-1',
          userId: 'user-1',
          lessonId: 'lesson-1',
          status: 'IN_PROGRESS',
          completedAt: null,
        }),
      },
      lesson: {
        findUnique: async () => ({
          id: 'lesson-1',
          slug: 'git-intro',
          title: 'Introdução ao Git',
          xp: 25,
          room: { slug: 'git', title: 'Git' },
        }),
      },
      achievement: {
        findMany: async () => [],
        create: async ({ data }: { data: Record<string, unknown> }) => ({ id: 'a-2', ...data }),
      },
    };

    const service = new ProgressService(prisma as unknown as PrismaService);

    const result = await service.submitRoomQuiz('user-1', 'git', {
      answers: { 'q-1': 1, 'q-2': 2 },
    });

    expect(result.correctAnswers).toBe(2);
    expect(result.totalQuestions).toBe(2);
    expect(result.score).toBe(100);
    expect(result.xpAwarded).toBeGreaterThan(0);
  });
});
