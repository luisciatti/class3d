import type { Floor, HealthResponse } from '@mundo/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Falha ao consultar ${path}: ${response.status}`);
  }

  return (await response.json()) as T;
}

export const api = {
  getHealth: () => fetchJson<HealthResponse>('/health'),
  getFloors: () => fetchJson<Floor[]>('/floors'),
};
