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
      positionX: -3,
      positionZ: -2,
      floorColor: '#1fa88a',
      prerequisites: [],
    },
    {
      slug: 'ci-cd',
      title: 'CI/CD',
      description: 'Automatização de build, testes e deploy com pipelines.',
      positionX: 1,
      positionZ: -2,
      floorColor: '#5b8def',
      prerequisites: ['git'],
    },
    {
      slug: 'docker',
      title: 'Docker',
      description: 'Containers, build, runtime e ambiente reproduzível.',
      positionX: 5,
      positionZ: -2,
      floorColor: '#8a5cf6',
      prerequisites: ['git'],
    },
  ];

  return { floor, rooms };
}
