import { z } from 'zod';

export const FloorContentSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  order: z.number().int().nonnegative(),
  theme: z.string().min(1),
  unlockRequirement: z.string().nullable().default(null),
});

export const LessonContentSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  order: z.number().int().nonnegative(),
  estimatedMinutes: z.number().int().positive(),
  xp: z.number().int().nonnegative(),
  content: z.string().min(1),
});

export const QuestionContentSchema = z
  .object({
    prompt: z.string().min(1),
    options: z.array(z.string()).min(2).max(6),
    correctIndex: z.number().int().nonnegative(),
    explanation: z.string().min(1),
    xp: z.number().int().nonnegative(),
  })
  .superRefine((question, ctx) => {
    if (question.correctIndex >= question.options.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['correctIndex'],
        message: 'correctIndex must reference a valid option index.',
      });
    }
  });

export const QuizContentSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  questions: z.array(QuestionContentSchema).min(1),
});

export const RoomContentSchema = z
  .object({
    slug: z.string().min(1),
    floorSlug: z.string().min(1),
    title: z.string().min(1),
    description: z.string().min(1),
    position: z.object({
      x: z.number(),
      z: z.number(),
    }),
    floorColor: z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/),
    prerequisites: z.array(z.string()).default([]),
    lessons: z.array(LessonContentSchema).default([]),
    quiz: QuizContentSchema.optional(),
  })
  .superRefine((room, ctx) => {
    if (room.lessons.length && room.lessons.some((lesson) => lesson.title.trim().length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['lessons'],
        message: 'lesson titles cannot be empty.',
      });
    }
  });

export const ContentDocumentSchema = z
  .object({
    floor: FloorContentSchema,
    rooms: z.array(RoomContentSchema),
  })
  .superRefine((document, ctx) => {
    const roomSlugs = new Set(document.rooms.map((room) => room.slug));

    document.rooms.forEach((room) => {
      room.prerequisites.forEach((prerequisite) => {
        if (!roomSlugs.has(prerequisite)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['rooms', room.slug, 'prerequisites'],
            message: `Prerequisite "${prerequisite}" must refer to a declared room slug in this floor.`,
          });
        }
      });
    });

    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (slug: string) => {
      if (visiting.has(slug)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['rooms'],
          message: `Circular dependency detected for room "${slug}".`,
        });
        return;
      }

      if (visited.has(slug)) {
        return;
      }

      visiting.add(slug);
      const room = document.rooms.find((candidate) => candidate.slug === slug);

      room?.prerequisites.forEach((prerequisite) => {
        if (roomSlugs.has(prerequisite)) {
          visit(prerequisite);
        }
      });

      visiting.delete(slug);
      visited.add(slug);
    };

    document.rooms.forEach((room) => visit(room.slug));
  });

export type FloorContent = z.infer<typeof FloorContentSchema>;
export type LessonContent = z.infer<typeof LessonContentSchema>;
export type QuestionContent = z.infer<typeof QuestionContentSchema>;
export type QuizContent = z.infer<typeof QuizContentSchema>;
export type RoomContent = z.infer<typeof RoomContentSchema>;
export type ContentDocument = z.infer<typeof ContentDocumentSchema>;

export type LessonMarkdownBlock = {
  type: 'heading' | 'paragraph' | 'list';
  value: string;
};

export function parseLessonMarkdown(markdown: string): LessonMarkdownBlock[] {
  const blocks: LessonMarkdownBlock[] = markdown
    .split(/\n{2,}/)
    .flatMap((block): LessonMarkdownBlock[] => {
      const trimmed = block.trim();

      if (!trimmed) {
        return [];
      }

      const listLines = trimmed
        .split(/\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => /^[-*]\s|^\d+\.\s/.test(line));

      if (trimmed.startsWith('#')) {
        return [{ type: 'heading', value: trimmed.replace(/^#+\s*/, '').trim() }];
      }

      if (listLines.length > 0) {
        return listLines.map((line): LessonMarkdownBlock => ({
          type: 'list',
          value: line.replace(/^[-*]\s*|^\d+\.\s*/, '').trim(),
        }));
      }

      return [{ type: 'paragraph', value: trimmed.replace(/\s+/g, ' ').trim() }];
    });

  return blocks.filter((block) => block.value.length > 0);
}
