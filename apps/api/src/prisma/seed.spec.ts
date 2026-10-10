import { describe, expect, it } from 'vitest';
import { buildSeedData } from './seed';

describe('buildSeedData', () => {
  it('creates the devops floor with three rooms and their prerequisites', () => {
    const seed = buildSeedData();
    const [firstRoom, secondRoom] = seed.rooms;

    expect(seed.floor.slug).toBe('devops');
    expect(seed.floor.title).toBe('DevOps');
    expect(seed.rooms.map((room) => room.slug)).toEqual(['git', 'ci-cd', 'docker']);
    expect(firstRoom?.prerequisites).toEqual([]);
    expect(secondRoom?.prerequisites).toEqual(['git']);
  });
});
