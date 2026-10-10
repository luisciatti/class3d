# Arquitetura e banco de dados

## Modelo de domínio

O núcleo do jogo é composto por usuários, progresso e conteúdo pedagógico organizados em andares, salas e aulas.

```mermaid
erDiagram
  USER ||--o{ PROGRESS : has
  USER ||--o{ ACHIEVEMENT : unlocks
  FLOOR ||--o{ ROOM : contains
  ROOM ||--o{ LESSON : includes
  LESSON ||--o{ QUESTION : has
  LESSON ||--o{ PROGRESS : tracks

  USER {
    string id PK
    string email
    string name
    string avatarUrl
    datetime createdAt
    datetime updatedAt
  }

  FLOOR {
    string id PK
    string slug UK
    string title
    int order
    string theme
    string unlockRequirement
  }

  ROOM {
    string id PK
    string slug UK
    string floorId FK
    string title
    string description
    float positionX
    float positionZ
    string floorColor
    string[] prerequisites
  }

  LESSON {
    string id PK
    string slug UK
    string roomId FK
    string title
    int order
    int estimatedMinutes
    int xp
    string content
  }

  QUESTION {
    string id PK
    string lessonId FK
    string prompt
    string[] options
    int correctIndex
    string explanation
    int xp
  }

  PROGRESS {
    string id PK
    string userId FK
    string lessonId FK
    enum status
    datetime completedAt
  }

  ACHIEVEMENT {
    string id PK
    string userId FK
    string slug UK
    string title
    string description
    datetime unlockedAt
  }
```

## Observações

- O conteúdo educacional é versionado em arquivos do repositório, mas o banco guarda o estado do usuário e o progresso individual.
- A estrutura de dados foi desenhada para permitir desbloqueio de conteúdo por prerequisites, gamificação por XP e conquistas por usuário.
- As salas e os andares podem ser reimportados de forma idempotente através do seed do Prisma.
