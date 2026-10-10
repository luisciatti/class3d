'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Floor } from '@mundo/shared';
import { parseLessonMarkdown } from '@mundo/shared';
import { WorldCanvas } from '../../components/world-canvas';
import { api, type RoomLessonsResponse } from '../../lib/api';

const fallbackFloors: Floor[] = [
  {
    slug: 'devops',
    title: 'DevOps',
    order: 1,
    theme: 'Infra e automação',
    unlockRequirement: null,
  },
  {
    slug: 'backend',
    title: 'Backend',
    order: 2,
    theme: 'APIs e integrações',
    unlockRequirement: 'Concluir DevOps',
  },
];

const fallbackRoomLessons: Record<string, RoomLessonsResponse> = {
  git: {
    room: { slug: 'git', title: 'Git', unlocked: true, lockedReason: null },
    lessons: [
      {
        id: 'lesson-git-basico',
        slug: 'git-basico',
        title: 'Git básico',
        order: 1,
        estimatedMinutes: 8,
        xp: 25,
        content:
          '# Git básico\n\nO Git registra alterações de um projeto em snapshots.\n\n- commit\n- branch\n- merge',
      },
      {
        id: 'lesson-git-fluxo',
        slug: 'git-fluxo',
        title: 'Fluxo de trabalho',
        order: 2,
        estimatedMinutes: 10,
        xp: 30,
        content:
          '# Fluxo de trabalho\n\nUse branches para isolar mudanças e revisar antes de mergear.\n\n- feature\n- develop\n- release',
      },
    ],
  },
  'ci-cd': {
    room: { slug: 'ci-cd', title: 'CI/CD', unlocked: true, lockedReason: null },
    lessons: [
      {
        id: 'lesson-pipelines',
        slug: 'pipelines',
        title: 'Pipelines',
        order: 1,
        estimatedMinutes: 9,
        xp: 30,
        content:
          '# Pipelines\n\nUma pipeline automatiza validações e entrega contínua.\n\n- build\n- test\n- deploy',
      },
      {
        id: 'lesson-github-actions',
        slug: 'github-actions',
        title: 'GitHub Actions',
        order: 2,
        estimatedMinutes: 12,
        xp: 35,
        content:
          '# GitHub Actions\n\nOs workflows orquestram jobs em ambientes repetíveis.\n\n- trigger\n- job\n- artifact',
      },
    ],
  },
};

type LessonStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export default function MundoPage() {
  const healthQuery = useQuery({
    queryKey: ['health'],
    queryFn: api.getHealth,
  });

  const floorsQuery = useQuery({
    queryKey: ['floors'],
    queryFn: api.getFloors,
  });

  const [activeRoomSlug, setActiveRoomSlug] = useState<string | null>(null);
  const [activeFloorSlug, setActiveFloorSlug] = useState<string>(
    fallbackFloors[0]?.slug ?? 'devops',
  );
  const [selectedLessonSlug, setSelectedLessonSlug] = useState<string | null>(null);
  const [progressByLesson, setProgressByLesson] = useState<Record<string, LessonStatus>>({});

  useEffect(() => {
    const handleRoomEnter = (event: Event) => {
      const detail = (event as CustomEvent<{ roomSlug?: string }>).detail;
      if (!detail?.roomSlug) {
        return;
      }

      setActiveRoomSlug(detail.roomSlug);
    };

    window.addEventListener('room:enter', handleRoomEnter);
    return () => window.removeEventListener('room:enter', handleRoomEnter);
  }, []);

  const roomLessonsQuery = useQuery({
    queryKey: ['room-lessons', activeRoomSlug],
    enabled: Boolean(activeRoomSlug),
    queryFn: async () => {
      if (!activeRoomSlug) {
        return fallbackRoomLessons.git;
      }

      try {
        const roomLessons = await api.getRoomLessons(activeRoomSlug);
        return roomLessons;
      } catch {
        return (
          fallbackRoomLessons[activeRoomSlug] ?? {
            room: {
              slug: activeRoomSlug,
              title: activeRoomSlug,
              unlocked: true,
              lockedReason: null,
            },
            lessons: [],
          }
        );
      }
    },
  });

  const lessons = roomLessonsQuery.data?.lessons ?? [];
  const room = roomLessonsQuery.data?.room ?? null;

  useEffect(() => {
    if (!lessons.length) {
      setSelectedLessonSlug(null);
      return;
    }

    const firstLesson = lessons[0];
    if (!firstLesson) {
      setSelectedLessonSlug(null);
      return;
    }

    if (!selectedLessonSlug || !lessons.some((lesson) => lesson.slug === selectedLessonSlug)) {
      setSelectedLessonSlug(firstLesson.slug);
    }
  }, [lessons, selectedLessonSlug]);

  const activeLesson = useMemo(
    () => lessons.find((lesson) => lesson.slug === selectedLessonSlug) ?? lessons[0] ?? null,
    [lessons, selectedLessonSlug],
  );

  const progressPercent = useMemo(() => {
    if (!lessons.length) {
      return 0;
    }

    const completed = lessons.filter(
      (lesson) => (progressByLesson[lesson.slug] ?? 'NOT_STARTED') === 'COMPLETED',
    ).length;

    return Math.round((completed / lessons.length) * 100);
  }, [lessons, progressByLesson]);

  const healthStatus = healthQuery.isSuccess
    ? `${healthQuery.data.service} · ${healthQuery.data.status}`
    : 'API indisponível';

  const floors = floorsQuery.data ?? fallbackFloors;
  const unlockedFloorSlugs = useMemo(() => new Set<string>(['devops']), []);

  const handleFloorChange = (nextFloor: Floor) => {
    if (!unlockedFloorSlugs.has(nextFloor.slug)) {
      return;
    }

    setActiveFloorSlug(nextFloor.slug);
    setActiveRoomSlug(null);
    setSelectedLessonSlug(null);
  };

  const completeLesson = async (lesson: (typeof lessons)[number]) => {
    const nextStatus: LessonStatus = 'COMPLETED';
    setProgressByLesson((current) => ({ ...current, [lesson.slug]: nextStatus }));

    try {
      await api.completeLesson(lesson.id ?? lesson.slug);
    } catch {
      // a API pode exigir autenticação antes do fluxo completo; o progresso local mantém a UX funcional.
    }

    const nextLessonIndex = lessons.findIndex((item) => item.slug === lesson.slug);
    const nextLesson = lessons[nextLessonIndex + 1] ?? lessons[0] ?? null;
    if (nextLesson) {
      setSelectedLessonSlug(nextLesson.slug);
    }
  };

  return (
    <main className="world-shell">
      <aside className="world-sidebar">
        <p className="eyebrow">Mundo 3D</p>
        <h1>Prédio de aprendizado</h1>

        <div className="status-card" aria-live="polite">
          <span className={`status-dot ${healthQuery.isSuccess ? 'online' : 'offline'}`} />
          <span>{healthStatus}</span>
        </div>

        <div className="floor-selector" aria-label="Seletor de andares">
          {floors.map((floor) => {
            const isUnlocked = unlockedFloorSlugs.has(floor.slug);
            const isActive = floor.slug === activeFloorSlug;

            return (
              <button
                key={floor.slug}
                type="button"
                className={`floor-option ${isActive ? 'active' : ''} ${isUnlocked ? '' : 'locked'}`}
                onClick={() => handleFloorChange(floor)}
                disabled={!isUnlocked}
                aria-pressed={isActive}
              >
                <span className="floor-option-header">
                  <span className="room-order">Andar {floor.order}</span>
                  {!isUnlocked ? <span className="status-badge locked">Bloqueado</span> : null}
                </span>
                <strong>{floor.title}</strong>
                <span>{floor.theme}</span>
                <small>{floor.unlockRequirement ?? 'Liberado imediatamente'}</small>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="world-canvas" aria-label="Cenário 3D do mundo">
        <WorldCanvas floorSlug={activeFloorSlug} />

        <aside className="lesson-panel" aria-live="polite">
          {!activeRoomSlug || !room ? (
            <div className="empty-state">
              <p className="eyebrow">Sala</p>
              <h2>Entre em uma sala</h2>
              <p>
                Ao atravessar a porta de um ambiente, o painel abre automaticamente com as aulas.
              </p>
            </div>
          ) : (
            <>
              <div className="lesson-header">
                <div>
                  <p className="eyebrow">Sala atual</p>
                  <h2>{room.title}</h2>
                </div>
                <span className={`status-badge ${room.unlocked ? 'ready' : 'locked'}`}>
                  {room.unlocked ? 'Aberta' : 'Bloqueada'}
                </span>
              </div>

              {room.lockedReason ? (
                <p className="room-lock-note">Motivo: {room.lockedReason}</p>
              ) : null}

              <div className="progress-track" aria-label="Progresso da sala">
                <span className="progress-fill" style={{ width: `${progressPercent}%` }} />
              </div>

              <div className="lesson-list" aria-label="Lista de aulas da sala">
                {lessons.length === 0 ? (
                  <p className="empty-copy">Ainda não há aulas publicadas para esta sala.</p>
                ) : (
                  lessons.map((lesson) => {
                    const status = progressByLesson[lesson.slug] ?? 'NOT_STARTED';

                    return (
                      <button
                        key={lesson.slug}
                        type="button"
                        className={`lesson-item ${selectedLessonSlug === lesson.slug ? 'selected' : ''}`}
                        onClick={() => setSelectedLessonSlug(lesson.slug)}
                      >
                        <div>
                          <strong>{lesson.title}</strong>
                          <small>
                            {lesson.estimatedMinutes} min · {lesson.xp} XP
                          </small>
                        </div>
                        <span
                          className={`status-badge ${status === 'COMPLETED' ? 'done' : 'pending'}`}
                        >
                          {status === 'COMPLETED' ? 'Concluída' : 'Pendente'}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              {activeLesson ? (
                <article className="lesson-content">
                  <div className="lesson-title-row">
                    <div>
                      <p className="eyebrow">Aula atual</p>
                      <h3>{activeLesson.title}</h3>
                    </div>
                    <span className="xp-pill">{activeLesson.xp} XP</span>
                  </div>

                  {(() => {
                    const blocks = parseLessonMarkdown(activeLesson.content);
                    const listItems = blocks.filter((block) => block.type === 'list');

                    return (
                      <>
                        {blocks.map((block, index) => {
                          if (block.type === 'heading') {
                            return <h4 key={`${block.type}-${index}`}>{block.value}</h4>;
                          }

                          if (block.type === 'list') {
                            return null;
                          }

                          return <p key={`${block.type}-${index}`}>{block.value}</p>;
                        })}

                        {listItems.length > 0 ? (
                          <ul className="lesson-list-items">
                            {listItems.map((block, index) => (
                              <li key={`${block.value}-${index}`}>{block.value}</li>
                            ))}
                          </ul>
                        ) : null}
                      </>
                    );
                  })()}

                  <button
                    type="button"
                    className="primary-button lesson-button"
                    onClick={() => completeLesson(activeLesson)}
                  >
                    Concluir aula
                  </button>
                </article>
              ) : null}
            </>
          )}
        </aside>
      </section>
    </main>
  );
}
