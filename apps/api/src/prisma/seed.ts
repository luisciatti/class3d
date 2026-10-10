export type SeedRoom = {
  slug: string;
  title: string;
  description: string;
  positionX: number;
  positionZ: number;
  floorColor: string;
  prerequisites: string[];
};

export type SeedFloor = {
  slug: string;
  title: string;
  order: number;
  theme: string;
  unlockRequirement: string | null;
};

export type SeedData = {
  floor: SeedFloor;
  rooms: SeedRoom[];
};

export function buildSeedData(): SeedData {
  const floor: SeedFloor = {
    slug: 'devops',
    title: 'DevOps',
    order: 1,
    theme: 'devops',
    unlockRequirement: null,
  };

  const rooms: SeedRoom[] = [
    {
      slug: 'git',
      title: 'Git',
      description: 'Fundamentos de versionamento, branches e colaboração em time.',
      positionX: -5,
      positionZ: -2,
      floorColor: '#4f46e5',
      prerequisites: [],
    },
    {
      slug: 'ci-cd',
      title: 'CI/CD',
      description: 'Automatização de build, testes e deploy com pipelines.',
      positionX: 0,
      positionZ: -2,
      floorColor: '#1fa88a',
      prerequisites: ['git'],
    },
    {
      slug: 'docker',
      title: 'Docker',
      description: 'Containers, build, runtime e ambiente reproduzível.',
      positionX: 5,
      positionZ: -2,
      floorColor: '#f59e0b',
      prerequisites: ['git'],
    },
    {
      slug: 'kubernetes',
      title: 'Kubernetes',
      description: 'Orquestração, escalabilidade e deployments resilientes.',
      positionX: -4,
      positionZ: 3,
      floorColor: '#0ea5e9',
      prerequisites: ['docker'],
    },
    {
      slug: 'observabilidade',
      title: 'Observabilidade',
      description: 'Logs, métricas, tracing e saúde dos sistemas em produção.',
      positionX: 4,
      positionZ: 3,
      floorColor: '#f97316',
      prerequisites: ['docker', 'kubernetes'],
    },
  ];

  return { floor, rooms };
}
