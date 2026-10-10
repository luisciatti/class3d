import { z } from 'zod';

export const ApiErrorCodeSchema = z.enum([
  'BAD_REQUEST',
  'NOT_FOUND',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'VALIDATION_ERROR',
  'INTERNAL_ERROR',
]);

export const FloorSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  order: z.number().int().nonnegative(),
  theme: z.string().min(1),
  unlockRequirement: z.string().nullable(),
});

export const RoomSchema = z.object({
  slug: z.string().min(1),
  floorSlug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  position3D: z.object({
    x: z.number(),
    z: z.number(),
  }),
  floorColor: z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/),
  prerequisites: z.array(z.string()),
});

export const LessonSchema = z.object({
  slug: z.string().min(1),
  roomSlug: z.string().min(1),
  title: z.string().min(1),
  order: z.number().int().nonnegative(),
  estimatedMinutes: z.number().int().positive(),
  xp: z.number().int().nonnegative(),
  content: z.string().min(1),
});

export const LessonStatusSchema = z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']);

export const ProgressSchema = z.object({
  userId: z.string().min(1),
  lessonId: z.string().min(1),
  status: LessonStatusSchema,
  completedAt: z.string().datetime().nullable(),
});

export const ApiErrorSchema = z.object({
  code: ApiErrorCodeSchema,
  message: z.string().min(1),
  details: z.record(z.unknown()).optional().default({}),
});

export const ReadyCheckSchema = z.object({
  database: z.enum(['up', 'down']),
  cache: z.enum(['up', 'down']),
});

export const ReadyResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  checks: ReadyCheckSchema,
  timestamp: z.string().datetime(),
});

export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;
export type Floor = z.infer<typeof FloorSchema>;
export type Room = z.infer<typeof RoomSchema>;
export type Lesson = z.infer<typeof LessonSchema>;
export type LessonStatus = z.infer<typeof LessonStatusSchema>;
export type Progress = z.infer<typeof ProgressSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
export type ReadyResponse = z.infer<typeof ReadyResponseSchema>;
