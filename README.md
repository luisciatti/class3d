# Mundo de Aprendizado

Plataforma de estudo em formato de **jogo 3D no navegador**: um prédio isométrico em que cada **andar** é uma área (ex.: DevOps) e cada **sala** é um tópico (ex.: CI/CD).

> Contexto completo para a IA: [`AGENTS.md`](AGENTS.md) · Tarefas: [`docs/BACKLOG.md`](docs/BACKLOG.md)

## Stack

Next.js + React Three Fiber (Three.js) · NestJS · PostgreSQL · Redis · Docker · GitHub Actions · pnpm + Turborepo

## Primeiros passos no Windows (PowerShell)

```powershell
pnpm install
pnpm setup:dev
pnpm dev
pnpm check:dev
```

> Use uma linha por comando no PowerShell 5.1. Não use `&&` nem sintaxe bash.

### Troubleshooting

- Docker Desktop fechado ou Docker não inicializado: `P1001` / "Docker not running"
- Porta 5432 ocupada por um PostgreSQL local: pare o serviço local ou altere `DATABASE_URL`
- `.env` ausente em `apps/api`: execute `pnpm setup:dev` para criá-lo automaticamente
- CORS bloqueando `http://localhost:3000`: verifique `apps/api/.env` com `CORS_ORIGIN="http://localhost:3000"`

## Rodando localmente

Pré-requisitos: Node 22, pnpm (via `corepack enable`), Docker.

```powershell
corepack enable
pnpm install
pnpm setup:dev
pnpm dev
```

Teste rápido: `Invoke-RestMethod http://localhost:4000/v1/health` e abra http://localhost:3000.

## Qualidade

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
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
