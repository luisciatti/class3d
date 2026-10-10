import type { Floor, HealthResponse } from '@mundo/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';

export type RoomLessonSummary = {
  id?: string;
  slug: string;
  title: string;
  order: number;
  estimatedMinutes: number;
  xp: number;
  content: string;
  unlocked?: boolean;
};

export type RoomLessonsResponse = {
  room: {
    slug: string;
    title: string;
    unlocked: boolean;
    lockedReason?: string | null;
  };
  lessons: RoomLessonSummary[];
};

async function fetchJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    method: init.method ?? 'GET',
    cache: init.cache ?? 'no-store',
    headers: {
      Accept: 'application/json',
      ...(init.headers instanceof Headers
        ? Object.fromEntries(init.headers.entries())
        : (init.headers ?? {})),
    },
  });

  if (!response.ok) {
    throw new Error(`Falha ao consultar ${path}: ${response.status}`);
  }

  return (await response.json()) as T;
}

export const api = {
  getHealth: () => fetchJson<HealthResponse>('/health'),
  getFloors: () => fetchJson<Floor[]>('/floors'),
  getRoomLessons: (slug: string) => fetchJson<RoomLessonsResponse>(`/rooms/${slug}/lessons`),
  completeLesson: async (lessonId: string) => {
    const response = await fetch(`${API_BASE_URL}/me/progress/${lessonId}`, {
      method: 'PATCH',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'completed' }),
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Falha ao concluir a aula ${lessonId}: ${response.status}`);
    }

    return (await response.json()) as Record<string, unknown>;
  },
};
