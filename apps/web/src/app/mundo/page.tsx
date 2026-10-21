'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Floor } from '@mundo/shared';
import { parseLessonMarkdown } from '@mundo/shared';
import { WorldCanvas, type WorldRoomState } from '../../components/world-canvas';
import { api, type ProgressSummary, type RoomLessonsResponse } from '../../lib/api';

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
    room: {
      slug: 'ci-cd',
      title: 'CI/CD',
      unlocked: false,
      lockedReason: 'Conclua Git para liberar esta sala.',
    },
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
  docker: {
    room: {
      slug: 'docker',
      title: 'Docker',
      unlocked: false,
      lockedReason: 'Conclua CI/CD para liberar esta sala.',
    },
    lessons: [],
  },
  observabilidade: {
    room: {
      slug: 'observabilidade',
      title: 'Observabilidade',
      unlocked: false,
      lockedReason: 'Conclua Docker para liberar esta sala.',
    },
    lessons: [],
  },
};

type LessonStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

type AchievementReward = {
  slug: string;
  title: string;
  description: string;
};

const achievementCatalog: AchievementReward[] = [
  {
    slug: 'first-lesson',
    title: 'Primeira aula',
    description: 'Você concluiu sua primeira aula.',
  },
  {
    slug: 'first-room',
    title: 'Primeira sala',
    description: 'Você dominou a sua primeira sala.',
  },
];

export function supportsWebGL(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }

  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}

export default function MundoPage() {
  const healthQuery = useQuery({
    queryKey: ['health'],
    queryFn: api.getHealth,
  });

  const [activeRoomSlug, setActiveRoomSlug] = useState<string | null>(null);
  const [activeFloorSlug, setActiveFloorSlug] = useState<string>(
    fallbackFloors[0]?.slug ?? 'devops',
  );
  const [selectedLessonSlug, setSelectedLessonSlug] = useState<string | null>(null);
  const [progressByLesson, setProgressByLesson] = useState<Record<string, LessonStatus>>({});
  const [isListMode, setIsListMode] = useState<boolean>(() => !supportsWebGL());
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isRoomPanelOpen, setIsRoomPanelOpen] = useState(false);
  const [toast, setToast] = useState<{ title: string; message: string } | null>(null);
  const unlockedAchievementIdsRef = useRef<Set<string>>(new Set());
  const hasInitializedAchievementsRef = useRef(false);

  useEffect(() => {
    if (!supportsWebGL()) {
      setIsListMode(true);
    }
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

  const isDemoMode = !healthQuery.isSuccess;
  const healthStatus = healthQuery.isSuccess
    ? `${healthQuery.data.service} · ${healthQuery.data.status}`
    : 'Modo demo · API indisponível';

  const localProgress = useMemo(() => {
    const completedLessons = lessons.filter(
      (lesson) => (progressByLesson[lesson.slug] ?? 'NOT_STARTED') === 'COMPLETED',
    );
    const xpEarned = completedLessons.reduce((sum, lesson) => sum + lesson.xp, 0);
    const level = Math.max(1, Math.floor(xpEarned / 100) + 1);

    const roomCount = new Set(
      lessons
        .filter((lesson) => (progressByLesson[lesson.slug] ?? 'NOT_STARTED') === 'COMPLETED')
        .map((lesson) => lesson.slug),
    ).size;

    const achievements = achievementCatalog.filter((achievement) => {
      if (achievement.slug === 'first-lesson') {
        return completedLessons.length >= 1;
      }

      if (achievement.slug === 'first-room') {
        return roomCount >= 1;
      }

      return false;
    });

    return {
      xpEarned,
      level,
      completedLessons: completedLessons.length,
      totalLessons: lessons.length,
      achievements,
    };
  }, [lessons, progressByLesson]);

  const mergedProgress = useMemo<ProgressSummary>(
    () => ({
      userId: 'local-player',
      totalLessons: localProgress.totalLessons,
      completedLessons: localProgress.completedLessons,
      inProgressLessons: 0,
      xpEarned: localProgress.xpEarned,
      level: localProgress.level,
      achievements: localProgress.achievements.map((achievement) => ({
        slug: achievement.slug,
        title: achievement.title,
        description: achievement.description,
        unlockedAt: new Date().toISOString(),
      })),
      lessons: [],
    }),
    [localProgress],
  );

  const xpProgress = mergedProgress.xpEarned % 100;
  const xpProgressPercent = Math.min(100, xpProgress);
  const nextLevelXp = 100 - xpProgress;

  useEffect(() => {
    if (!hasInitializedAchievementsRef.current) {
      hasInitializedAchievementsRef.current = true;
      unlockedAchievementIdsRef.current = new Set(
        mergedProgress.achievements.map((achievement) => achievement.slug),
      );
      return;
    }

    const newlyUnlocked = mergedProgress.achievements.filter(
      (achievement) => !unlockedAchievementIdsRef.current.has(achievement.slug),
    );

    if (newlyUnlocked.length === 0) {
      return;
    }

    const latest = newlyUnlocked[0];
    if (!latest) {
      return;
    }

    setToast({
      title: latest.title,
      message: latest.description ?? 'Conquista desbloqueada.',
    });

    unlockedAchievementIdsRef.current = new Set(
      mergedProgress.achievements.map((achievement) => achievement.slug),
    );

    const timeoutId = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeoutId);
  }, [mergedProgress.achievements]);

  const floors = fallbackFloors;
  const unlockedFloorSlugs = useMemo(() => new Set<string>(['devops']), []);
  const roomOptions = useMemo(
    () =>
      Object.values(fallbackRoomLessons).map((entry) => ({
        slug: entry.room.slug,
        title: entry.room.title,
        unlocked: entry.room.unlocked,
      })),
    [],
  );

  const worldRoomStates = useMemo<WorldRoomState[]>(() => {
    const positions: Record<string, readonly [number, number, number]> = {
      git: [-3.2, 0, 2.2],
      'ci-cd': [2.6, 0, 1.2],
      docker: [-2.6, 0, -2.9],
      observabilidade: [3.2, 0, -2.8],
    };

    return Object.values(fallbackRoomLessons).map((entry) => ({
      slug: entry.room.slug,
      label: entry.room.title,
      accent: entry.room.unlocked ? 'Disponível' : 'Bloqueada',
      position: positions[entry.room.slug] ?? [0, 0, 0],
      color: entry.room.unlocked ? '#13b7a6' : '#94a3b8',
      unlocked: entry.room.unlocked,
      lockedReason: entry.room.lockedReason,
    }));
  }, []);

  const handleFloorChange = (nextFloor: Floor) => {
    if (!unlockedFloorSlugs.has(nextFloor.slug)) {
      return;
    }

    setActiveFloorSlug(nextFloor.slug);
    setActiveRoomSlug(null);
    setSelectedLessonSlug(null);
  };

  const handleRoomSelect = (nextRoomSlug: string) => {
    const nextRoom = Object.values(fallbackRoomLessons).find(
      (entry) => entry.room.slug === nextRoomSlug,
    );
    if (!nextRoom || !nextRoom.room.unlocked) {
      return;
    }

    setActiveRoomSlug(nextRoomSlug);
    setIsRoomPanelOpen(true);
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

  const visibleRoomList = useMemo(() => {
    if (activeFloorSlug === 'backend') {
      return roomOptions.filter((room) => room.slug === 'git' || room.slug === 'ci-cd');
    }

    return roomOptions;
  }, [activeFloorSlug, roomOptions]);

  const roomLabel = room?.title ?? visibleRoomList[0]?.title ?? 'Sala';

  return (
    <main className="world-shell">
      <aside className={`world-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-title-wrap">
            <p className="eyebrow">Mundo 3D</p>
            <h1>Prédio de aprendizado</h1>
          </div>
          <button
            type="button"
            className="collapse-toggle"
            aria-label={isSidebarCollapsed ? 'Expandir painel lateral' : 'Colapsar painel lateral'}
            onClick={() => setIsSidebarCollapsed((value) => !value)}
          >
            {isSidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        <div
          className="status-card"
          aria-live="polite"
          data-mode={isDemoMode ? 'demo' : 'live'}
          title={isDemoMode ? 'Modo demo com dados locais' : 'API online'}
        >
          <span className={`status-dot ${healthQuery.isSuccess ? 'online' : 'offline'}`} />
          <span>{healthStatus}</span>
        </div>

        <div className="player-hud" aria-live="polite">
          <div className="hud-header">
            <div>
              <p className="eyebrow">Progresso</p>
              <h2>Nível {mergedProgress.level}</h2>
            </div>
            <span className="level-badge">{mergedProgress.xpEarned} XP</span>
          </div>

          <div className="xp-meter" aria-label="Barra de XP do jogador">
            <span style={{ width: `${xpProgressPercent}%` }} />
          </div>

          <div className="hud-summary">
            <span>
              {mergedProgress.completedLessons}/{mergedProgress.totalLessons} aulas
            </span>
            <span>{nextLevelXp} XP para o próximo nível</span>
          </div>

          <div className="achievement-list" aria-label="Conquistas desbloqueadas">
            {mergedProgress.achievements.length > 0 ? (
              mergedProgress.achievements.map((achievement) => (
                <div key={achievement.slug} className="achievement-item">
                  <span className="achievement-icon" aria-hidden="true">
                    ✓
                  </span>
                  <div>
                    <strong>{achievement.title}</strong>
                    <small>{achievement.description}</small>
                  </div>
                </div>
              ))
            ) : (
              <div className="achievement-item empty">
                <span className="achievement-icon" aria-hidden="true">
                  •
                </span>
                <div>
                  <strong>Ainda sem conquistas</strong>
                  <small>Conclua sua primeira aula para começar.</small>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="view-toggle" role="tablist" aria-label="Alternar visualização do mundo">
          <button
            type="button"
            role="tab"
            aria-selected={!isListMode}
            className={`view-tab ${!isListMode ? 'selected' : ''}`}
            onClick={() => setIsListMode(false)}
          >
            Visão 3D
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isListMode}
            className={`view-tab ${isListMode ? 'selected' : ''}`}
            onClick={() => setIsListMode(true)}
          >
            Visão lista
          </button>
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

      {toast ? (
        <div className="achievement-toast" role="status" aria-live="polite">
          <strong>{toast.title}</strong>
          <span>{toast.message}</span>
        </div>
      ) : null}

      {isListMode ? (
        <section className="list-mode" aria-label="Lista acessível do mundo">
          <nav className="list-panel" aria-label="Navegação por salas">
            <h2>Salas</h2>
            <ul className="accessible-list" role="list">
              {visibleRoomList.map((entry) => (
                <li key={entry.slug}>
                  <button
                    type="button"
                    className={`access-item ${activeRoomSlug === entry.slug ? 'selected' : ''}`}
                    onClick={() => handleRoomSelect(entry.slug)}
                    aria-pressed={activeRoomSlug === entry.slug}
                  >
                    <strong>{entry.title}</strong>
                    <span>{entry.unlocked ? 'Disponível' : 'Bloqueada'}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <article className="list-panel lesson-panel accessible-lesson-panel" aria-live="polite">
            <div className="lesson-header">
              <div>
                <p className="eyebrow">Sala atual</p>
                <h2>{roomLabel}</h2>
              </div>
              <span className={`status-badge ${(room?.unlocked ?? true) ? 'ready' : 'locked'}`}>
                {(room?.unlocked ?? true) ? 'Aberta' : 'Bloqueada'}
              </span>
            </div>

            <div className="progress-track" aria-label="Progresso da sala">
              <span className="progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>

            <div className="lesson-list" aria-label="Lista de aulas em modo texto">
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
          </article>
        </section>
      ) : (
        <section className="world-canvas" aria-label="Cenário 3D do mundo">
          <WorldCanvas
            floorSlug={activeFloorSlug}
            roomStates={worldRoomStates}
            onRoomEnter={(roomSlug) => {
              setActiveRoomSlug(roomSlug);
              setIsRoomPanelOpen(true);
            }}
          />

          <aside className={`lesson-panel ${isRoomPanelOpen ? 'open' : ''}`} aria-live="polite">
            {!activeRoomSlug || !room ? (
              <div className="empty-state">
                <button
                  type="button"
                  className="panel-close"
                  onClick={() => setIsRoomPanelOpen(false)}
                  aria-label="Fechar dica de sala"
                >
                  ×
                </button>
                <p className="eyebrow">Sala</p>
                <h2>Clique numa sala</h2>
                <p>
                  Caminhe até a porta de um ambiente ou toque numa sala para abrir o painel de
                  aulas.
                </p>
              </div>
            ) : (
              <>
                <div className="lesson-header">
                  <div>
                    <p className="eyebrow">Sala atual</p>
                    <h2>{room.title}</h2>
                  </div>
                  <button
                    type="button"
                    className="panel-close"
                    onClick={() => setIsRoomPanelOpen(false)}
                    aria-label="Fechar painel da sala"
                  >
                    ×
                  </button>
                </div>

                <span className={`status-badge ${room.unlocked ? 'ready' : 'locked'}`}>
                  {room.unlocked ? 'Aberta' : 'Bloqueada'}
                </span>

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
      )}
    </main>
  );
}
