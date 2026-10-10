import { describe, expect, it } from 'vitest';
import { buildSeedData } from './seed';

describe('buildSeedData', () => {
  it('creates the devops floor with the complete room catalog and prerequisites', () => {
    const seed = buildSeedData();
    const [firstRoom, secondRoom, thirdRoom, fourthRoom, fifthRoom] = seed.rooms;

    expect(seed.floor.slug).toBe('devops');
    expect(seed.floor.title).toBe('DevOps');
    expect(seed.rooms.map((room) => room.slug)).toEqual([
      'git',
      'ci-cd',
      'docker',
      'kubernetes',
      'observabilidade',
    ]);
    expect(firstRoom?.prerequisites).toEqual([]);
    expect(secondRoom?.prerequisites).toEqual(['git']);
    expect(thirdRoom?.prerequisites).toEqual(['git']);
    expect(fourthRoom?.prerequisites).toEqual(['docker']);
    expect(fifthRoom?.prerequisites).toEqual(['docker', 'kubernetes']);
  });
});
