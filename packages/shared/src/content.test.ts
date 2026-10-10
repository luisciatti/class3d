import { describe, expect, it } from 'vitest';
import { ContentDocumentSchema, parseLessonMarkdown } from './content.js';

describe('content schema validation', () => {
  it('parses lesson markdown into readable blocks', () => {
    const blocks = parseLessonMarkdown(
      '# O que é pipeline?\n\nTodo deploy começa por uma pipeline.\n\n- build\n- test\n- deploy',
    );

    expect(blocks).toEqual([
      { type: 'heading', value: 'O que é pipeline?' },
      { type: 'paragraph', value: 'Todo deploy começa por uma pipeline.' },
      { type: 'list', value: 'build' },
      { type: 'list', value: 'test' },
      { type: 'list', value: 'deploy' },
    ]);
  });

  it('accepts a valid DevOps content document', () => {
    const document = {
      floor: {
        slug: 'devops',
        title: 'DevOps',
        order: 1,
        theme: 'devops',
        unlockRequirement: null,
      },
      rooms: [
        {
          slug: 'ci-cd',
          floorSlug: 'devops',
          title: 'CI/CD',
          description: 'Automação de build e entrega.',
          position: { x: 4, z: -2 },
          floorColor: '#1fa88a',
          prerequisites: [],
          lessons: [
            {
              slug: 'lesson-01-pipelines',
              title: 'Pipelines',
              order: 1,
              estimatedMinutes: 8,
              xp: 25,
              content: 'A pipeline automatiza testes e deploy.',
            },
          ],
          quiz: {
            slug: 'quiz-ci-cd',
            title: 'Validação de CI/CD',
            questions: [
              {
                prompt: 'O que é pipeline?',
                options: [
                  'Uma rota HTTP',
                  'Uma sequência de etapas automatizadas',
                  'Um banco de dados',
                ],
                correctIndex: 1,
                explanation: 'Pipeline é a sequência automatizada de etapas.',
                xp: 10,
              },
            ],
          },
        },
      ],
    };

    expect(ContentDocumentSchema.parse(document)).toMatchObject({
      floor: { slug: 'devops' },
      rooms: [{ slug: 'ci-cd' }],
    });
  });

  it('rejects a room whose prerequisite is not declared', () => {
    const invalidDocument = {
      floor: {
        slug: 'devops',
        title: 'DevOps',
        order: 1,
        theme: 'devops',
        unlockRequirement: null,
      },
      rooms: [
        {
          slug: 'docker',
          floorSlug: 'devops',
          title: 'Docker',
          description: 'Containers e imagens.',
          position: { x: 1, z: 3 },
          floorColor: '#6a5ef7',
          prerequisites: ['ci-cd'],
          lessons: [],
        },
      ],
    };

    expect(() => ContentDocumentSchema.parse(invalidDocument)).toThrow();
  });
});
