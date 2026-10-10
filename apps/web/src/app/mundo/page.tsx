'use client';

import { useQuery } from '@tanstack/react-query';
import type { Floor } from '@mundo/shared';
import { api } from '../../lib/api';

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

export default function MundoPage() {
  const healthQuery = useQuery({
    queryKey: ['health'],
    queryFn: api.getHealth,
  });

  const floorsQuery = useQuery({
    queryKey: ['floors'],
    queryFn: api.getFloors,
  });

  const floors = floorsQuery.data ?? fallbackFloors;
  const healthStatus = healthQuery.isSuccess
    ? `${healthQuery.data.service} · ${healthQuery.data.status}`
    : 'API indisponível';

  return (
    <main className="world-shell">
      <aside className="world-sidebar">
        <p className="eyebrow">Mundo 3D</p>
        <h1>Prédio de aprendizado</h1>

        <div className="status-card" aria-live="polite">
          <span className={`status-dot ${healthQuery.isSuccess ? 'online' : 'offline'}`} />
          <span>{healthStatus}</span>
        </div>

        <div className="room-list" aria-label="Lista de andares">
          {floors.map((floor) => (
            <article key={floor.slug} className="room-card">
              <div>
                <span className="room-order">Andar {floor.order}</span>
                <h2>{floor.title}</h2>
              </div>
              <p>{floor.theme}</p>
              <small>{floor.unlockRequirement ?? 'Liberado imediatamente'}</small>
            </article>
          ))}
        </div>
      </aside>

      <section className="world-canvas" aria-label="Cenário 3D">
        <div className="scene-grid">
          <div className="scene-card scene-main">
            <span className="scene-badge">Sala atual</span>
            <h2>DevOps</h2>
            <p>CI/CD, Docker, Git, Kubernetes e observabilidade em um prédio isométrico.</p>
          </div>

          <div className="scene-card room-tile tile-green">
            <span>Git</span>
            <strong>Fundamentos</strong>
          </div>

          <div className="scene-card room-tile tile-violet">
            <span>CI/CD</span>
            <strong>Automação</strong>
          </div>

          <div className="scene-card room-tile tile-blue">
            <span>Docker</span>
            <strong>Containers</strong>
          </div>

          <div className="scene-card room-tile tile-gold">
            <span>Observabilidade</span>
            <strong>Monitoramento</strong>
          </div>
        </div>
      </section>
    </main>
  );
}
