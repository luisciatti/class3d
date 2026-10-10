import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { parse } from 'yaml';
import { ContentDocumentSchema, type RoomContent } from '@mundo/shared';

const prisma = new PrismaClient();
const contentRoot = path.resolve(__dirname, '../../../../content');

function listYamlFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return listYamlFiles(fullPath);
    }

    return entry.isFile() && fullPath.endsWith('.yml') ? [fullPath] : [];
  });
}

function parseYaml<T>(filePath: string): T {
  const content = readFileSync(filePath, 'utf8');
  const parsed = parse(content);

  if (!parsed) {
    throw new Error(`No YAML content found in ${filePath}.`);
  }

  return parsed as T;
}

async function sync(): Promise<void> {
  const floorPath = path.join(contentRoot, 'devops', 'floor.yml');
  const floor = parseYaml<{
    slug: string;
    title: string;
    order: number;
    theme: string;
    unlockRequirement?: string | null;
  }>(floorPath);
  const roomFiles = listYamlFiles(path.join(contentRoot, 'devops', 'rooms')).sort();
  const rooms = roomFiles.map((file) => parseYaml<RoomContent>(file));

  const document = { floor, rooms };
  const validated = ContentDocumentSchema.parse(document);

  const savedFloor = await prisma.floor.upsert({
    where: { slug: validated.floor.slug },
    update: {
      title: validated.floor.title,
      order: validated.floor.order,
      theme: validated.floor.theme,
      unlockRequirement: validated.floor.unlockRequirement,
    },
    create: {
      slug: validated.floor.slug,
      title: validated.floor.title,
      order: validated.floor.order,
      theme: validated.floor.theme,
      unlockRequirement: validated.floor.unlockRequirement,
    },
  });

  for (const room of validated.rooms) {
    const roomRecord = await prisma.room.upsert({
      where: { slug: room.slug },
      update: {
        floorId: savedFloor.id,
        title: room.title,
        description: room.description,
        positionX: room.position.x,
        positionZ: room.position.z,
        floorColor: room.floorColor,
        prerequisites: room.prerequisites,
      },
      create: {
        slug: room.slug,
        floorId: savedFloor.id,
        title: room.title,
        description: room.description,
        positionX: room.position.x,
        positionZ: room.position.z,
        floorColor: room.floorColor,
        prerequisites: room.prerequisites,
      },
    });

    for (const lesson of room.lessons) {
      const lessonRecord = await prisma.lesson.upsert({
        where: { slug: lesson.slug },
        update: {
          roomId: roomRecord.id,
          title: lesson.title,
          order: lesson.order,
          estimatedMinutes: lesson.estimatedMinutes,
          xp: lesson.xp,
          content: lesson.content,
        },
        create: {
          slug: lesson.slug,
          roomId: roomRecord.id,
          title: lesson.title,
          order: lesson.order,
          estimatedMinutes: lesson.estimatedMinutes,
          xp: lesson.xp,
          content: lesson.content,
        },
      });

      for (const question of room.quiz?.questions ?? []) {
        const existingQuestion = await prisma.question.findFirst({
          where: {
            lessonId: lessonRecord.id,
            prompt: question.prompt,
          },
        });

        if (existingQuestion) {
          await prisma.question.update({
            where: { id: existingQuestion.id },
            data: {
              options: question.options,
              correctIndex: question.correctIndex,
              explanation: question.explanation,
              xp: question.xp,
            },
          });
        } else {
          await prisma.question.create({
            data: {
              lessonId: lessonRecord.id,
              prompt: question.prompt,
              options: question.options,
              correctIndex: question.correctIndex,
              explanation: question.explanation,
              xp: question.xp,
            },
          });
        }
      }
    }

    if (room.quiz) {
      const quizLesson = await prisma.lesson.upsert({
        where: { slug: room.quiz.slug },
        update: {
          roomId: roomRecord.id,
          title: room.quiz.title,
          order: room.lessons.length + 1,
          estimatedMinutes: 10,
          xp: room.quiz.questions.reduce((sum, question) => sum + question.xp, 0),
          content: `Quiz: ${room.quiz.title}`,
        },
        create: {
          slug: room.quiz.slug,
          roomId: roomRecord.id,
          title: room.quiz.title,
          order: room.lessons.length + 1,
          estimatedMinutes: 10,
          xp: room.quiz.questions.reduce((sum, question) => sum + question.xp, 0),
          content: `Quiz: ${room.quiz.title}`,
        },
      });

      for (const question of room.quiz.questions) {
        const existingQuestion = await prisma.question.findFirst({
          where: {
            lessonId: quizLesson.id,
            prompt: question.prompt,
          },
        });

        if (existingQuestion) {
          await prisma.question.update({
            where: { id: existingQuestion.id },
            data: {
              options: question.options,
              correctIndex: question.correctIndex,
              explanation: question.explanation,
              xp: question.xp,
            },
          });
        } else {
          await prisma.question.create({
            data: {
              lessonId: quizLesson.id,
              prompt: question.prompt,
              options: question.options,
              correctIndex: question.correctIndex,
              explanation: question.explanation,
              xp: question.xp,
            },
          });
        }
      }
    }
  }

  console.log(`Content sync completed for floor ${validated.floor.slug}.`);
}

sync()
  .catch((error) => {
    console.error('Content sync failed.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
