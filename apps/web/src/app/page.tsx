import Link from 'next/link';

const floorCards = [
  { title: 'DevOps', subtitle: 'Git · CI/CD · Docker', badge: 'Andar 1' },
  { title: 'Backend', subtitle: 'APIs · bancos · segurança', badge: 'Andar 2' },
  { title: 'UX', subtitle: 'Design e experiência', badge: 'Andar 3' },
];

export default function Home() {
  return (
    <main className="page-shell">
      <section className="hero-panel">
        <p className="eyebrow">Mundo de Aprendizado</p>
        <h1>Aprender tecnologia como um jogo 3D.</h1>
        <p>
          Explore um prédio isométrico, entre em salas temáticas e avance por aulas, quizzes e
          desafios de DevOps, backend e UX.
        </p>

        <div className="hero-actions">
          <Link href="/mundo" className="primary-button">
            Entrar no mundo
          </Link>
          <a href="#andares" className="secondary-button">
            Ver andares
          </a>
        </div>

        <ul className="meta-grid" aria-label="Resumo do produto">
          <li>
            <strong>3D</strong>
            <span>Mapa isométrico em tempo real</span>
          </li>
          <li>
            <strong>XP</strong>
            <span>Progresso por aula e quiz</span>
          </li>
          <li>
            <strong>Conteúdo</strong>
            <span>Versionado como código</span>
          </li>
        </ul>
      </section>

      <section id="andares" className="floor-grid" aria-label="Andares disponíveis">
        {floorCards.map((floor) => (
          <article key={floor.title} className="floor-card">
            <p className="eyebrow">{floor.badge}</p>
            <h2>{floor.title}</h2>
            <p>{floor.subtitle}</p>
            <small>Em desenvolvimento</small>
          </article>
        ))}
      </section>
    </main>
  );
}
