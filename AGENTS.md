# AGENTS.md — Contexto do projeto para a IA

> Leia este arquivo inteiro antes de qualquer tarefa. Ele é a fonte de verdade sobre o que estamos construindo, a stack, as convenções e as regras. Se algo aqui conflitar com um pedido, pergunte antes de agir.

## 1. O que é o projeto

**Nome provisório:** Mundo de Aprendizado (trocar quando houver nome definitivo).

Uma plataforma de estudo em formato de **jogo 3D no navegador**. O usuário entra em um **prédio isométrico**. Cada **andar** é uma área de conhecimento e cada **sala** do andar é um tópico específico.

Exemplo: Andar **DevOps** → salas **CI/CD**, **Docker**, **Git**, **Kubernetes**, **Observabilidade**.

O usuário controla um avatar que anda pelo andar, entra em uma sala, e ali abre aulas, faz quizzes e exercícios. Ao concluir, ganha XP e conquistas e desbloqueia novas salas e andares.

### Referência visual

Estilo de escritório **isométrico low-poly**: câmera em ângulo fixo de cima, salas delimitadas por paredes baixas, **pisos coloridos por sala** (verde-água, roxo etc.), mesas, plantas, estantes, sofás, personagens pequenos e estilizados. Cada sala tem uma **placa flutuante** (billboard) com o nome do tópico e o status (ex.: "CI/CD — 2/5 aulas"). Iluminação suave com sombras. Deve rodar bem em notebooks comuns e em celulares.

### Objetivos do produto

1. Aprender de forma prática e divertida, com progresso visível no espaço 3D.
2. Conteúdo **versionado como código** (Markdown/MDX + YAML no repositório), revisado via Pull Request.
3. Projeto também serve como **portfólio de DevOps**: pipeline de CI/CD completo, containers, segurança e observabilidade desde o começo.

### Fora do escopo (por enquanto)

Multiplayer em tempo real, chat, pagamentos, app nativo, editor de código dentro do jogo, geração de conteúdo por IA em runtime. Não implemente nada disso sem pedido explícito.

## 2. Stack (decidida)

| Camada                | Tecnologia                                               |
| --------------------- | -------------------------------------------------------- |
| Monorepo              | pnpm workspaces + Turborepo                              |
| Front-end             | Next.js (App Router) + TypeScript strict                 |
| 3D                    | Three.js via **React Three Fiber** + `@react-three/drei` |
| Estado / dados        | Zustand (estado do jogo), TanStack Query (API)           |
| Back-end              | NestJS + TypeScript, REST versionado (`/v1`), OpenAPI    |
| Banco                 | PostgreSQL + Prisma                                      |
| Cache                 | Redis                                                    |
| Validação / contratos | zod em `packages/shared`                                 |
| Auth                  | OAuth GitHub/Google + JWT (access curto + refresh)       |
| Testes                | Vitest/Jest (unit), Supertest (API), Playwright (e2e)    |
| Containers            | Docker multi-stage, docker compose, registry GHCR        |
| CI/CD                 | GitHub Actions                                           |
| IaC (fase final)      | Terraform                                                |

Não troque nem adicione bibliotecas grandes sem justificar em um ADR (`docs/adr/`).

## 3. Estrutura do repositório

```
apps/web        Next.js + cena 3D
apps/api        NestJS
packages/shared tipos e schemas zod compartilhados (contrato front↔back)
packages/ui     componentes de UI compartilhados
packages/config eslint, tsconfig, prettier
content/        andares, salas, aulas, quizzes (YAML + MDX)
infra/          docker, compose, terraform
docs/           arquitetura, ADRs, backlog
.github/        workflows, templates, dependabot, CODEOWNERS
```

## 4. Modelo de domínio

- **Floor** (andar): `slug`, `title`, `order`, `theme`, `unlockRequirement`
- **Room** (sala): `slug`, `floorSlug`, `title`, `position3D {x,z}`, `floorColor`, `prerequisites[]`
- **Lesson**: `slug`, `roomSlug`, `title`, `order`, `estimatedMinutes`, `xp`, conteúdo MDX
- **Quiz / Question**: múltipla escolha, `explanation`, `xp`
- **User**, **Progress** (`userId`, `lessonId`, `status`, `completedAt`), **Achievement**

**Fonte de verdade do conteúdo = pasta `content/`.** Um comando (`pnpm content:sync`) valida e importa o conteúdo para o banco. O banco guarda usuário e progresso; o conteúdo vem dos arquivos.

### Exemplo de `room.yml`

```yaml
slug: ci-cd
floor: devops
title: CI/CD
description: Automatize build, teste e deploy com pipelines.
position: { x: 4, z: -2 }
floorColor: '#1fa88a'
prerequisites: [git]
lessons:
  - lesson-01-o-que-e-ci-cd
  - lesson-02-github-actions-basico
```

## 5. Comandos padrão (devem sempre funcionar)

```
pnpm install
pnpm dev            # web + api em modo desenvolvimento
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm content:validate
pnpm deps:up        # só Postgres + Redis (desenvolvimento com hot-reload)
pnpm docker:up      # stack completa em containers (web, api, postgres, redis)
```

## 6. Convenções

- TypeScript `strict`, sem `any` (exceção justificada em comentário).
- **Conventional Commits** (`feat:`, `fix:`, `chore:`, `docs:`, `ci:`...). Um PR por tarefa, pequeno e focado.
- Branches: `feat/T-014-nome-curto`. PRs devem referenciar a Issue (`Closes #N`).
- Todo endpoint novo: DTO validado com zod, documentado no OpenAPI, com teste.
- Todo componente 3D: sem lógica de negócio dentro; dados entram por props/store.
- Variáveis de ambiente: sempre documentadas em `.env.example`. **Nunca** commitar segredos.
- Nomes de código em inglês; textos de interface e conteúdo em português do Brasil.

## 7. Regras de performance do 3D

- Câmera **ortográfica** isométrica (ângulo fixo), com zoom e pan limitados.
- Modelos em **glTF/GLB** comprimidos (Draco/meshopt), texturas em WebP/KTX2.
- Use **instancing** para objetos repetidos (mesas, plantas, cadeiras).
- Iluminação preferencialmente baked; no máximo 1 luz direcional com sombra.
- Meta: 60 FPS em notebook comum, 30 FPS em celular médio; bundle inicial < 500 KB gzip (cena carregada sob demanda).
- Carregar apenas o andar atual (lazy load).
- Respeitar `prefers-reduced-motion` e oferecer modo "lista" acessível (alternativa 2D à cena 3D, navegável por teclado).

## 8. Definição de pronto (Definition of Done)

Uma tarefa só está pronta quando:

1. Todos os **critérios de aceite** da tarefa em `docs/BACKLOG.md` foram atendidos.
2. `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm build` passam.
3. Há testes para a lógica nova.
4. A documentação foi atualizada (README, `.env.example`, OpenAPI ou ADR, conforme o caso).
5. O CI no GitHub está verde.

## 9. Como a IA deve trabalhar

- Execute **uma tarefa por vez**, na ordem do backlog, salvo instrução contrária.
- Antes de codar: resuma o plano em poucas linhas e liste os arquivos que vai criar/alterar.
- Prefira soluções simples e padrão de mercado a soluções "espertas".
- Se faltar informação ou houver mais de uma opção razoável, **pergunte** em vez de assumir.
- Ao terminar: informe o que foi feito, como testar e o que ficou pendente.
- Não altere arquivos fora do escopo da tarefa. Não faça refactors "de passagem".
- Não instale dependências sem dizer quais e por quê.
- Não desative testes, lint ou checks do CI para "fazer passar".
- Não invente fatos de conteúdo educacional: se não tiver certeza de um dado técnico nas aulas, sinalize com `TODO(revisar)`.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
