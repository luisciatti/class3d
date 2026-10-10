import type { Floor, HealthResponse } from '@mundo/shared';

const sampleHealth: HealthResponse = {
  status: 'ok',
  service: 'web',
  timestamp: new Date().toISOString(),
};

const sampleFloor: Floor = {
  slug: 'devops',
  title: 'DevOps',
  order: 1,
  theme: 'devops',
  unlockRequirement: null,
};

export default function Home() {
  return (
    <main style={{ padding: 32 }}>
      <h1>Mundo de Aprendizado</h1>
      <p>Esqueleto inicial. A cena 3D entra na tarefa T-019.</p>
      <p>
        Contrato ativo: {sampleHealth.service} · {sampleFloor.title} · {sampleFloor.theme}
      </p>
    </main>
  );
}
