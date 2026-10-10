import { PrismaClient } from '@prisma/client';
import { buildSeedData } from '../src/prisma/seed';

const prisma = new PrismaClient();

const lessonsByRoom = {
  git: [
    {
      slug: 'git-01-visao-geral',
      title: 'Visão geral do Git',
      order: 1,
      estimatedMinutes: 8,
      xp: 25,
      content: '# Git\n\nAprenda a criar commits e branchs.',
    },
    {
      slug: 'git-02-branches-e-merge',
      title: 'Branches e merge',
      order: 2,
      estimatedMinutes: 10,
      xp: 30,
      content: '# Branches\n\nEntenda como bifurcar e integrar mudanças.',
    },
  ],
  'ci-cd': [
    {
      slug: 'ci-cd-01-pipelines',
      title: 'Pipelines de CI/CD',
      order: 1,
      estimatedMinutes: 10,
      xp: 35,
      content: '# CI/CD\n\nAutomatize build, teste e deploy.',
    },
    {
      slug: 'ci-cd-02-github-actions',
      title: 'GitHub Actions',
      order: 2,
      estimatedMinutes: 12,
      xp: 40,
      content: '# GitHub Actions\n\nCrie workflows simples e confiáveis.',
    },
  ],
  docker: [
    {
      slug: 'docker-01-microservicos',
      title: 'Containers em prática',
      order: 1,
      estimatedMinutes: 12,
      xp: 40,
      content: '# Docker\n\nEmbalando aplicações em containers.',
    },
    {
      slug: 'docker-02-imagens-e-volumes',
      title: 'Imagens e volumes',
      order: 2,
      estimatedMinutes: 12,
      xp: 45,
      content: '# Volumes\n\nPersistência e evolução do ambiente.',
    },
  ],
} as const;

async function main() {
  const { floor, rooms } = buildSeedData();

  const createdFloor = await prisma.floor.upsert({
    where: { slug: floor.slug },
    update: {
      title: floor.title,
      order: floor.order,
      theme: floor.theme,
      unlockRequirement: floor.unlockRequirement,
    },
    create: {
      slug: floor.slug,
      title: floor.title,
      order: floor.order,
      theme: floor.theme,
      unlockRequirement: floor.unlockRequirement,
    },
  });

  for (const room of rooms) {
    const createdRoom = await prisma.room.upsert({
      where: { slug: room.slug },
      update: {
        title: room.title,
        description: room.description,
        positionX: room.positionX,
        positionZ: room.positionZ,
        floorColor: room.floorColor,
        prerequisites: room.prerequisites,
        floorId: createdFloor.id,
      },
      create: {
        slug: room.slug,
        title: room.title,
        description: room.description,
        positionX: room.positionX,
        positionZ: room.positionZ,
        floorColor: room.floorColor,
        prerequisites: room.prerequisites,
        floorId: createdFloor.id,
      },
    });

    const lessons = lessonsByRoom[room.slug as keyof typeof lessonsByRoom];

    for (const lesson of lessons) {
      await prisma.lesson.upsert({
        where: { slug: lesson.slug },
        update: {
          title: lesson.title,
          order: lesson.order,
          estimatedMinutes: lesson.estimatedMinutes,
          xp: lesson.xp,
          content: lesson.content,
          roomId: createdRoom.id,
        },
        create: {
          slug: lesson.slug,
          title: lesson.title,
          order: lesson.order,
          estimatedMinutes: lesson.estimatedMinutes,
          xp: lesson.xp,
          content: lesson.content,
          roomId: createdRoom.id,
        },
      });
    }
  }

  console.log(`Seed concluído: ${rooms.length} salas em ${floor.title}`);
}

void main()
  .catch((error) => {
    console.error('Falha no seed do Prisma:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
