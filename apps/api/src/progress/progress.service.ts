import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type UpdateProgressStatus = 'in_progress' | 'completed';

export type ProgressSummary = {
  userId: string;
  totalLessons: number;
  completedLessons: number;
  inProgressLessons: number;
  xpEarned: number;
  level: number;
  achievements: Array<{
    slug: string;
    title: string;
    description?: string | null;
    unlockedAt: Date;
  }>;
  lessons: Array<{
    lessonId: string;
    slug: string;
    title: string;
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
    xp: number;
    completedAt?: Date | null;
    roomSlug?: string | null;
    roomTitle?: string | null;
  }>;
};

@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyProgress(userId: string): Promise<ProgressSummary> {
    const entries = await this.prisma.progress.findMany({
      where: { userId },
      include: {
        lesson: {
          include: { room: { select: { slug: true, title: true } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const achievements = await this.prisma.achievement.findMany({
      where: { userId },
      orderBy: { unlockedAt: 'desc' },
    });

    const xpEarned = entries.reduce((sum, entry) => {
      if (entry.status === 'COMPLETED') {
        return sum + (entry.lesson?.xp ?? 0);
      }
      return sum;
    }, 0);

    return {
      userId,
      totalLessons: entries.length,
      completedLessons: entries.filter((entry) => entry.status === 'COMPLETED').length,
      inProgressLessons: entries.filter((entry) => entry.status === 'IN_PROGRESS').length,
      xpEarned,
      level: this.calculateLevel(xpEarned),
      achievements: achievements.map((achievement) => ({
        slug: achievement.slug,
        title: achievement.title,
        description: achievement.description,
        unlockedAt: achievement.unlockedAt,
      })),
      lessons: entries.map((entry) => ({
        lessonId: entry.lessonId,
        slug: entry.lesson.slug,
        title: entry.lesson.title,
        status: entry.status,
        xp: entry.lesson.xp,
        completedAt: entry.completedAt,
        roomSlug: entry.lesson.room?.slug ?? null,
        roomTitle: entry.lesson.room?.title ?? null,
      })),
    };
  }

  async updateLessonProgress(userId: string, lessonId: string, status: UpdateProgressStatus) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { room: true },
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson ${lessonId} not found`);
    }

    const normalizedStatus = status === 'completed' ? 'COMPLETED' : 'IN_PROGRESS';
    const existing = await this.prisma.progress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });

    const now = new Date();
    const progress = await this.prisma.progress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      update: {
        status: normalizedStatus,
        completedAt: normalizedStatus === 'COMPLETED' ? (existing?.completedAt ?? now) : null,
      },
      create: {
        userId,
        lessonId,
        status: normalizedStatus,
        completedAt: normalizedStatus === 'COMPLETED' ? now : null,
      },
    });

    let xpAwarded = 0;
    let completed = false;

    if (normalizedStatus === 'COMPLETED' && existing?.status !== 'COMPLETED') {
      xpAwarded = lesson.xp;
      completed = true;
      await this.unlockAchievements(userId);
    }

    const xpTotal = await this.getUserXp(userId);

    return {
      lessonId,
      lessonSlug: lesson.slug,
      roomSlug: lesson.room.slug,
      status: progress.status,
      completedAt: progress.completedAt,
      xpAwarded,
      completed,
      level: this.calculateLevel(xpTotal),
    };
  }

  async submitRoomQuiz(
    userId: string,
    roomSlug: string,
    payload: { answers?: Record<string, string | number> | Array<number> } = {},
  ) {
    const room = await this.prisma.room.findUnique({
      where: { slug: roomSlug },
      include: {
        lessons: {
          include: {
            questions: true,
          },
        },
      },
    });

    if (!room) {
      throw new NotFoundException(`Room ${roomSlug} not found`);
    }

    const questions = room.lessons.flatMap((lesson) =>
      lesson.questions.map((question) => ({
        ...question,
        lessonId: lesson.id,
        lessonSlug: lesson.slug,
        lessonTitle: lesson.title,
      })),
    );

    if (questions.length === 0) {
      throw new BadRequestException(`Room ${roomSlug} has no quiz questions yet`);
    }

    const answers = Array.isArray(payload.answers)
      ? payload.answers
      : Object.values(payload.answers ?? {});

    let correctAnswers = 0;
    let xpAwarded = 0;
    const explanations: Array<{
      questionId: string;
      lessonId: string;
      correct: boolean;
      selectedIndex: number | null;
      correctIndex: number;
      explanation?: string | null;
    }> = [];

    for (const question of questions) {
      const selectedValue = Array.isArray(payload.answers)
        ? (answers[questions.indexOf(question)] ?? null)
        : (payload.answers?.[question.id] ?? null);

      const selectedIndex =
        selectedValue === null || selectedValue === undefined ? null : Number(selectedValue);
      const isCorrect = selectedIndex !== null && selectedIndex === question.correctIndex;

      if (isCorrect) {
        correctAnswers += 1;
      }

      explanations.push({
        questionId: question.id,
        lessonId: question.lessonId,
        correct: isCorrect,
        selectedIndex,
        correctIndex: question.correctIndex,
        explanation: question.explanation ?? null,
      });

      if (isCorrect) {
        const result = await this.updateLessonProgress(userId, question.lessonId, 'completed');
        xpAwarded += result.xpAwarded;
      }
    }

    const totalQuestions = questions.length;
    const score = totalQuestions === 0 ? 0 : Math.round((correctAnswers / totalQuestions) * 100);

    return {
      roomSlug,
      totalQuestions,
      correctAnswers,
      score,
      xpAwarded,
      passed: score >= 70,
      explanations,
    };
  }

  async getLeaderboard(limit = 10) {
    const users = await this.prisma.user.findMany({
      include: { progress: { include: { lesson: true } } },
    });

    const leaderboard = users
      .map((user) => ({
        userId: user.id,
        name: user.name ?? user.email ?? 'Jogador',
        xp: user.progress.reduce(
          (sum, entry) => (entry.status === 'COMPLETED' ? sum + (entry.lesson?.xp ?? 0) : sum),
          0,
        ),
      }))
      .sort((left, right) => right.xp - left.xp)
      .slice(0, limit)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    return leaderboard;
  }

  private async getUserXp(userId: string): Promise<number> {
    const progress = await this.prisma.progress.findMany({
      where: { userId, status: 'COMPLETED' },
      include: { lesson: true },
    });

    return progress.reduce((sum, entry) => sum + (entry.lesson?.xp ?? 0), 0);
  }

  private calculateLevel(xp: number): number {
    return Math.max(1, Math.floor(xp / 100) + 1);
  }

  private async unlockAchievements(userId: string) {
    const completedCount = await this.prisma.progress.count({
      where: { userId, status: 'COMPLETED' },
    });

    const existingAchievements = await this.prisma.achievement.findMany({
      where: { userId },
      select: { slug: true },
    });

    const unlockedSlugs = new Set(existingAchievements.map((achievement) => achievement.slug));
    const candidates: Array<{ slug: string; title: string; description: string }> = [
      { slug: 'first-lesson', title: 'Primeira aula', description: 'Concluiu sua primeira aula.' },
      {
        slug: 'first-room',
        title: 'Primeira sala',
        description: 'Completou a primeira sala com êxito.',
      },
    ];

    for (const candidate of candidates) {
      if (unlockedSlugs.has(candidate.slug)) {
        continue;
      }

      const shouldUnlock =
        candidate.slug === 'first-lesson' ? completedCount >= 1 : completedCount >= 1;

      if (shouldUnlock) {
        await this.prisma.achievement.create({
          data: {
            userId,
            slug: candidate.slug,
            title: candidate.title,
            description: candidate.description,
          },
        });
      }
    }
  }
}
