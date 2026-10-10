# BACKLOG — Mundo de Aprendizado

Como usar: cada tarefa vira uma **GitHub Issue** (título = ID + nome). A IA executa uma por vez, na ordem. Leia `AGENTS.md` antes.

Formato: **Objetivo → Passos → Critérios de aceite → Como validar**.
Estimativa: P (≤ 2h), M (meio dia), G (1 dia+).

---

## FASE 0 — Fundação

### T-001 · Repositório e monorepo (M)
**Objetivo:** criar a base do monorepo pnpm + Turborepo.
**Passos:**
1. Criar `package.json` raiz, `pnpm-workspace.yaml` (`apps/*`, `packages/*`), `turbo.json` com pipelines `build`, `lint`, `typecheck`, `test`, `dev`.
2. Criar pacotes vazios: `apps/web`, `apps/api`, `packages/shared`, `packages/ui`, `packages/config`.
3. `packages/config`: `tsconfig.base.json` (strict), ESLint flat config, Prettier.
4. Criar `.gitignore`, `.editorconfig`, `.nvmrc` (Node 22 LTS), campo `packageManager` com versão do pnpm.
5. Adicionar Husky + lint-staged + commitlint (Conventional Commits).
**Critérios de aceite:**
- `pnpm install && pnpm lint && pnpm typecheck && pnpm build` passam em máquina limpa.
- Commit fora do padrão é rejeitado pelo commitlint.
**Validar:** clonar em outra pasta e rodar os comandos.

### T-002 · Documentação e templates do GitHub (P)
**Objetivo:** padronizar colaboração.
**Passos:** `README.md` (visão, stack, como rodar), `LICENSE` (MIT), `CONTRIBUTING.md`, `.github/ISSUE_TEMPLATE/{task,bug}.yml`, `.github/pull_request_template.md` (checklist da Definition of Done), `.github/CODEOWNERS`.
**Critérios de aceite:** templates aparecem ao criar Issue/PR no GitHub; README explica como subir o projeto em 3 comandos.

### T-003 · Ambiente de desenvolvimento reproduzível (M)
**Objetivo:** qualquer pessoa (e a IA) trabalhar no mesmo ambiente.
**Passos:**
1. `.devcontainer/devcontainer.json` (Node 22, pnpm, Docker-in-Docker, extensões: ESLint, Prettier, Prisma, Docker, GitHub Actions, Copilot).
2. `.vscode/settings.json` (format on save, ESLint), `.vscode/extensions.json`, `.vscode/tasks.json` (`dev`, `test`, `lint`, `docker:up`).
3. Copiar `AGENTS.md` para a raiz e criar `.github/copilot-instructions.md` apontando para ele.
**Critérios de aceite:** "Reopen in Container" funciona e `pnpm dev` roda lá dentro.

### T-004 · CI básico (M)
**Objetivo:** primeiro pipeline.
**Passos:** `.github/workflows/ci.yml` disparado em `pull_request` e `push` na `main`: checkout → setup pnpm/Node com cache → `pnpm install --frozen-lockfile` → `lint` → `typecheck` → `test` → `build`. Usar `concurrency` para cancelar execuções antigas. Permissões mínimas (`contents: read`). Actions fixadas por versão/SHA.
**Critérios de aceite:** PR com erro de lint falha; PR correto fica verde; tempo com cache < 3 min.

### T-005 · Proteção da `main` e automações (P)
**Objetivo:** governança.
**Passos:** configurar branch protection (PR obrigatório, check `ci` obrigatório, sem push direto); `.github/dependabot.yml` (npm, docker, github-actions, semanal); habilitar secret scanning e Dependabot alerts.
**Critérios de aceite:** push direto na `main` é bloqueado; Dependabot abre PRs de teste.

---

## FASE 1 — Containers

### T-006 · Dockerfile da API (M)
**Objetivo:** imagem pequena e segura.
**Passos:** `infra/docker/api.Dockerfile` multi-stage (build → runtime `node:22-alpine`), usando `pnpm deploy --legacy --prod` para copiar só as dependências de produção, usuário não-root, `NODE_ENV=production`, `HEALTHCHECK` em `/v1/health`, `.dockerignore`. **(Entregue no esqueleto inicial — revisar e ajustar.)**
**Critérios de aceite:** imagem final < 250 MB; container sobe e `/health` responde 200; `docker run` não roda como root.

### T-007 · Dockerfile do Web (M)
**Objetivo:** idem para o Next.js.
**Passos:** `output: 'standalone'` no `next.config`; multi-stage; usuário não-root; healthcheck.
**Critérios de aceite:** imagem final < 300 MB; página inicial abre via container.

### T-008 · Docker Compose de desenvolvimento (M)
**Objetivo:** subir tudo com um comando.
**Passos:** `infra/compose/docker-compose.yml` com `web`, `api`, `postgres:16`, `redis:7`; dois arquivos: `docker-compose.yml` (stack completa) e `docker-compose.deps.yml` (só Postgres/Redis; o hot-reload é feito com `pnpm dev` no Dev Container ou na máquina); healthchecks e `depends_on: condition: service_healthy`; `.env.example` na raiz; script de migração/seed ao subir.
**Critérios de aceite:** `docker compose up` em máquina limpa deixa web em `localhost:3000` e API em `localhost:4000` funcionando; dados do Postgres persistem em volume.

### T-009 · Publicação de imagens no GHCR (M)
**Objetivo:** CD de imagens.
**Passos:** `.github/workflows/docker-publish.yml` na `main` e em tags `v*`: Buildx + cache `type=gha`, login no GHCR com `GITHUB_TOKEN`, tags (`sha`, `latest`, semver), build multi-arch (`linux/amd64,linux/arm64`).
**Critérios de aceite:** após merge, imagens aparecem em Packages com as tags corretas e rodam via `docker pull`/`run`.

### T-010 · Segurança no pipeline (M)
**Objetivo:** shift-left security.
**Passos:** `security.yml` com CodeQL (JS/TS), Trivy nas imagens (falha em HIGH/CRITICAL), Gitleaks, `pnpm audit` (não bloqueante no início); agendar semanalmente.
**Critérios de aceite:** um segredo falso commitado em branch de teste é detectado; relatório aparece na aba Security.

---

## FASE 2 — Back-end MVP

### T-011 · Esqueleto da API NestJS (M)
**Passos:** criar app NestJS em `apps/api`; prefixo global `/v1`; `ConfigModule` com validação de env (zod); `GET /health` e `GET /ready` (checa Postgres e Redis); Swagger em `/docs`; logger estruturado (pino); CORS configurável; rate limit (`@nestjs/throttler`); Helmet.
**Critérios de aceite:** `/health` 200, `/docs` mostra a spec, teste e2e do health passa.

### T-012 · Banco e Prisma (M)
**Passos:** schema Prisma com `User`, `Floor`, `Room`, `Lesson`, `Question`, `Progress`, `Achievement`; migration inicial; `PrismaService`; seed mínimo (1 andar DevOps, 3 salas).
**Critérios de aceite:** `pnpm db:migrate` e `pnpm db:seed` funcionam local e no compose; diagrama ER em `docs/arquitetura.md`.

### T-013 · Contrato compartilhado (M)
**Passos:** em `packages/shared`, criar schemas zod e tipos para `Floor`, `Room`, `Lesson`, `Progress`, erros (`{code, message, details}`); a API valida entrada/saída com eles; o front importa os mesmos tipos.
**Critérios de aceite:** alterar um schema quebra o typecheck dos dois lados até ser ajustado.

### T-014 · Pipeline de conteúdo (G)
**Passos:** definir schemas zod de `floor.yml`, `room.yml`, `quiz.yml` e frontmatter MDX; criar `pnpm content:validate` (valida schema, slugs únicos, pré-requisitos existentes, sem ciclos, links internos); criar `pnpm content:sync` (upsert no banco, idempotente); workflow `content-check.yml` rodando a validação quando `content/**` mudar; criar conteúdo exemplo: andar `devops`, sala `ci-cd` com 2 aulas e 1 quiz.
**Critérios de aceite:** conteúdo inválido falha no CI com mensagem clara (arquivo + campo); rodar `sync` duas vezes não duplica dados.

### T-015 · Endpoints de conteúdo (M)
**Passos:** `GET /v1/floors`, `GET /v1/floors/:slug`, `GET /v1/rooms/:slug`, `GET /v1/rooms/:slug/lessons`, `GET /v1/lessons/:slug`; resposta indica `locked`/`unlocked` conforme pré-requisitos e usuário; cache em Redis (TTL curto) para conteúdo público.
**Critérios de aceite:** testes cobrindo sala bloqueada, desbloqueada e inexistente (404); OpenAPI atualizado.

### T-016 · Autenticação (G)
**Passos:** OAuth GitHub (e Google depois) → cria/atualiza `User` → emite JWT access (15 min) + refresh em cookie httpOnly; `GET /v1/me`; guard `JwtAuthGuard`; logout revoga refresh.
**Critérios de aceite:** fluxo completo funciona local; rotas protegidas retornam 401 sem token; segredos só via env.

### T-017 · Progresso e gamificação (G)
**Passos:** `GET /v1/me/progress`; `PATCH /v1/me/progress/:lessonId` (status `in_progress`/`completed`); `POST /v1/rooms/:slug/quiz/submit` (corrige no servidor, retorna acertos e explicações, concede XP uma única vez); cálculo de nível; conquistas básicas ("primeira sala concluída"); desbloqueio automático de salas/andares; `GET /v1/leaderboard`.
**Critérios de aceite:** concluir a mesma aula duas vezes não duplica XP; testes de regra de desbloqueio; cobertura ≥ 80% nos serviços.

---

## FASE 3 — Front-end 3D MVP

### T-018 · App Next.js base (M)
**Passos:** Next.js App Router em `apps/web`; layout, tema (claro/escuro), fonte, Tailwind; cliente da API tipado com `packages/shared`; TanStack Query; página `/` (landing) e `/mundo` (jogo).
**Critérios de aceite:** build ok; Lighthouse (Performance/Acessibilidade) ≥ 90 na landing.

### T-019 · Cena 3D base (G)
**Passos:** em `apps/web/src/features/world`, criar `<WorldCanvas>` com R3F; `OrthographicCamera` isométrica fixa (rotação ~45° em Y, ~35° em X), zoom e pan limitados (OrbitControls travado); luz ambiente + direcional com sombra suave; chão em grade e fundo escuro (referência: prédio flutuando sobre grade); `Suspense` com loading; contador de FPS em modo dev (`<Stats />`).
**Critérios de aceite:** cena renderiza a 60 FPS; redimensionar a janela mantém o enquadramento; sem warnings no console.

### T-020 · Componentes do andar (G)
**Passos:** componentes `<Floor>`, `<Room>` (piso colorido via `floorColor`, paredes baixas, porta), `<Desk>`, `<Chair>`, `<Plant>`, `<Bookshelf>`, `<Sofa>`; usar modelos glTF (começar com primitivas/caixas coloridas se não houver assets) e `InstancedMesh` para mesas/cadeiras; `<Billboard>` flutuante com título e progresso da sala (como as placas da referência); posicionar salas a partir de `position` vindo da API.
**Critérios de aceite:** andar `devops` aparece com 3 salas de cores diferentes e placas legíveis; adicionar uma sala nova em `content/` a faz aparecer sem alterar código.

### T-021 · Avatar e navegação (G)
**Passos:** avatar simples (cápsula/low-poly) controlado por clique no chão (raycast) e setas/WASD; pathfinding em grade (A* com `pathfinding` ou implementação própria) desviando de paredes; animação suave de caminhada; câmera segue levemente o avatar; entrar na área da porta de uma sala dispara o evento `room:enter`.
**Critérios de aceite:** avatar nunca atravessa paredes; funciona com mouse, teclado e toque.

### T-022 · Painel da sala e aula (M)
**Passos:** ao entrar na sala, abre painel lateral (UI React sobre o canvas) com lista de aulas e status; renderizar MDX da aula; botão "Concluir aula" chama `PATCH progress`; atualizar placa e barra de progresso em tempo real.
**Critérios de aceite:** fluxo entrar → ler → concluir → ver progresso atualizado funciona sem recarregar; salas bloqueadas mostram o motivo.

### T-023 · Seletor de andares (elevador) (M)
**Passos:** UI de elevador listando andares (bloqueados em cinza); troca de andar com transição de câmera; carregar assets do andar sob demanda (lazy).
**Critérios de aceite:** trocar de andar não trava a UI; memória não cresce ao alternar repetidamente (dispose de geometrias/texturas).

### T-024 · Modo acessível 2D (M)
**Passos:** alternância "Visão 3D / Visão lista" com a mesma navegação (andares → salas → aulas) em HTML semântico; foco por teclado; `prefers-reduced-motion`; fallback automático se WebGL não estiver disponível.
**Critérios de aceite:** é possível completar uma aula só com teclado e leitor de tela; testes de acessibilidade (axe) sem erros críticos.

---

## FASE 4 — Conteúdo e gamificação

### T-025 · Conteúdo do andar DevOps (G)
Salas: `git`, `ci-cd`, `docker`, `kubernetes` (intro), `observabilidade`. Cada sala: 3–5 aulas curtas (5–10 min), 1 quiz de 5 questões, 1 exercício prático com link para um repositório-template. Marcar dúvidas técnicas com `TODO(revisar)`.
**Critérios de aceite:** `content:validate` passa; todas as salas têm pré-requisitos coerentes.

### T-026 · XP, níveis, conquistas e HUD (M)
Barra de XP, nível e conquistas no HUD; efeito visual ao subir de nível; toast de conquista.
**Critérios de aceite:** valores batem com a API; sem recarregar a página.

### T-027 · Desbloqueio visual (M)
Salas bloqueadas com porta fechada/piso acinzentado e dica de pré-requisito; animação de abertura ao desbloquear.

---

## FASE 5 — Qualidade, release e produção

### T-028 · Testes e2e com Playwright (M)
Cenários: login (mock OAuth), abrir andar, entrar na sala, concluir aula, ver XP. Workflow `e2e.yml` sobe o `docker compose` no CI e roda os testes; salvar traces/vídeos como artifacts em caso de falha.
**Critérios de aceite:** suíte < 5 min, estável (sem flaky em 10 execuções seguidas).

### T-029 · Release automatizado (P)
`release-please` com Conventional Commits: PR de release, `CHANGELOG.md`, tag `vX.Y.Z` que dispara o `docker-publish`.

### T-030 · Deploy staging e produção (G)
Escolher destino em ADR (opções: Vercel/Cloudflare para o web + Fly.io/Railway para API; ou VPS com Compose + Caddy). `deploy.yml`: staging automático após merge; produção com aprovação manual (GitHub Environments); autenticação por OIDC quando o provedor permitir; migrations executadas no deploy; rollback documentado.
**Critérios de aceite:** merge na `main` leva a staging em < 10 min; smoke test (`/health`) roda após o deploy.

### T-031 · Observabilidade (M)
Logs estruturados, Sentry (web e API), métricas básicas e tracing com OpenTelemetry; dashboard simples.
**Critérios de aceite:** um erro forçado aparece no Sentry com release e ambiente.

### T-032 · Infra como código (G)
Terraform em `infra/terraform` para os recursos do provedor escolhido; workflow `terraform-plan` em PR e `apply` manual.

### T-033 · Performance e otimização 3D (M)
Auditar com `r3f-perf`/Chrome DevTools: draw calls, tamanho dos assets, compressão Draco/KTX2, code-splitting; documentar resultados e metas atingidas em `docs/performance.md`.

---

## Ordem recomendada para começar

`T-001 → T-002 → T-003 → T-004 → T-005 → T-006 → T-007 → T-008 → T-009 → T-010`, e só depois a Fase 2.
Assim o pipeline de CI/CD e os containers já existem antes do primeiro código de negócio.

## Prompt inicial sugerido para a IA

> Leia `AGENTS.md` e `docs/BACKLOG.md`. Comece pela tarefa **T-001**. Antes de codar, me mostre o plano e a lista de arquivos que vai criar. Ao terminar, rode lint/typecheck/build e me diga como testar. Não avance para a próxima tarefa sem eu aprovar.
