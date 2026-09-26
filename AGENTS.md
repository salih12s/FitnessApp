# FitnessApp Repository Instructions

Future task prompts are intentionally concise. Interpret them together with this file, `README.md`, and the relevant documentation in `docs/`.

Planned work, phase specs, and product decisions live in `docs/roadmap.md`. A prompt such as "implement phase 1" refers to that file.

## Stack and architecture

- Frontend: React, Vite, and TypeScript in `apps/web`.
- Backend: Node.js, NestJS, and TypeScript in `apps/api`.
- Database: MySQL (MariaDB compatible, hosted on Hostinger) with Prisma.
- Preserve the existing npm-workspace monorepo architecture unless a task explicitly requires a change.
- Do not replace the selected stack or introduce Next.js, another backend framework, another ORM, SQLite, Docker, microservices, GraphQL, Redis, or similar infrastructure unless explicitly requested.

## Implementation rules

- Inspect the current implementation before changing it and choose the smallest safe change when a requirement conflicts with the repository.
- Keep changes scoped to the requested task; do not automatically implement the next development stage.
- Reuse existing components, services, patterns, and architecture before creating new abstractions.
- Avoid unnecessary dependencies, dead code, duplication, premature abstractions, and `any`.
- Keep controllers thin and place business logic in appropriate services.
- Keep commands and development workflows Windows-friendly.
- Never commit secrets or real `.env` files; maintain `.env.example` files instead.

## Frontend

- Follow `docs/design-system.md` for UI decisions and semantic design tokens.
- For UI work, also use the design skills in `.claude/skills/` (`ui-ux-pro-max`, `redesign-existing-projects`, `design-taste-frontend`) as described in `docs/design-system.md`.
- Keep every screen mobile-first, accessible, and fully responsive.

## Database

- Follow `docs/database.md` for schema conventions, relationships, ownership, indexes, and deletion behavior.
- Preserve historical workout data conservatively; do not introduce destructive cascades without an explicit requirement and documented justification.

## Verification

- Before finishing, run the relevant formatting, lint, typecheck, build, and feature-specific verification available in the environment.
- Fix errors introduced by the task.
- Never claim something was tested or works unless it was actually verified.
