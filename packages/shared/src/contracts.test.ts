import { describe, expect, it } from 'vitest';
import { ApiErrorSchema, FloorSchema, LessonSchema, ProgressSchema, RoomSchema } from './index';

describe('shared contracts', () => {
  it('accepts valid game domain payloads', () => {
    const floor = FloorSchema.parse({
      slug: 'devops',
      title: 'DevOps',
      order: 1,
      theme: 'devops',
      unlockRequirement: null,
    });

    const room = RoomSchema.parse({
      slug: 'ci-cd',
      floorSlug: 'devops',
      title: 'CI/CD',
      description: 'Automatize build, testes e deploy.',
      position3D: { x: 4, z: -2 },
      floorColor: '#5b8def',
      prerequisites: ['git'],
    });

    const lesson = LessonSchema.parse({
      slug: 'lesson-01-github-actions',
      roomSlug: 'ci-cd',
      title: 'GitHub Actions',
      order: 1,
      estimatedMinutes: 12,
      xp: 50,
      content: 'Introdução ao fluxo de CI/CD.',
    });

    const progress = ProgressSchema.parse({
      userId: 'user_123',
      lessonId: 'lesson_456',
      status: 'COMPLETED',
      completedAt: '2026-10-10T12:00:00.000Z',
    });

    expect(floor.slug).toBe('devops');
    expect(room.position3D).toEqual({ x: 4, z: -2 });
    expect(lesson.roomSlug).toBe('ci-cd');
    expect(progress.status).toBe('COMPLETED');
  });

  it('rejects malformed API errors', () => {
    expect(() => ApiErrorSchema.parse({ code: 'UNKNOWN', message: 'boom' })).toThrow();
  });
});
