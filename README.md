# Mundo de Aprendizado

Plataforma de estudo em formato de **jogo 3D no navegador**: um prédio isométrico em que cada **andar** é uma área (ex.: DevOps) e cada **sala** é um tópico (ex.: CI/CD).

> Contexto completo para a IA: [`AGENTS.md`](AGENTS.md) · Tarefas: [`docs/BACKLOG.md`](docs/BACKLOG.md)

## Stack
Next.js + React Three Fiber (Three.js) · NestJS · PostgreSQL · Redis · Docker · GitHub Actions · pnpm + Turborepo

## Rodando localmente

Pré-requisitos: Node 22, pnpm (via `corepack enable`), Docker.

```bash
corepack enable
pnpm install

# Opção A — desenvolvimento com hot-reload
pnpm deps:up        # Postgres + Redis em containers
pnpm dev            # web em :3000, api em :4000

# Opção B — tudo em containers (roda em qualquer lugar)
pnpm docker:up      # web em :3000, api em :4000
```

Teste rápido: `curl localhost:4000/v1/health` e abra http://localhost:3000.

## Qualidade
```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

## Imagens Docker
Publicadas no GHCR a cada merge na `main`:
`ghcr.io/<usuario>/<repo>/api` e `ghcr.io/<usuario>/<repo>/web`

## Estrutura
```
apps/web        Next.js (cena 3D entra na T-019)
apps/api        NestJS
packages/shared contratos (zod) compartilhados
infra/          Dockerfiles e docker compose
.github/        workflows de CI/CD e segurança
docs/           backlog, guias
```
