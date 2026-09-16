# FitnessApp

FitnessApp is a production-minded, mobile-first fitness tracking web application. This repository currently contains only the initial project foundation: workspace structure, frontend design baseline, and a minimal backend health endpoint.

Product features such as authentication, exercises, workout logging, progress charts, and persistence are intentionally not implemented yet.

## Stack

### Frontend

- React and TypeScript
- Vite
- React Router
- Tailwind CSS
- shadcn/ui conventions
- Lucide React icons

### Backend

- Node.js and TypeScript
- NestJS
- REST API
- `@nestjs/config` for environment configuration

PostgreSQL and Prisma are planned for a later phase but are not initialized in this foundation.

## Architecture

The project is a small npm workspace monorepo. The frontend and backend are independently buildable and deployable while sharing root-level development commands and conventions.

```text
fitness-app/
├── apps/
│   ├── api/          # NestJS REST API
│   └── web/          # React + Vite client
├── docs/
│   └── design-system.md
├── package.json
└── README.md
```

## Prerequisites

- The latest active Node.js LTS is recommended.
- The application runtime supports Node.js 20.19 or newer. NestJS 12 code generators have a higher requirement: Node.js 22.22.3+, 24.15+, or 26+.
- npm 10 or newer

## Installation

From the repository root:

```bash
npm install
```

## Environment setup

Copy the example files before local development:

```powershell
Copy-Item apps/web/.env.example apps/web/.env
Copy-Item apps/api/.env.example apps/api/.env
```

The defaults are ready for local development. `DATABASE_URL` is documented for future use and may remain empty.

Never commit real secrets. Local `.env` files are ignored by Git.

## Development commands

| Command                | Purpose                           |
| ---------------------- | --------------------------------- |
| `npm run dev`          | Run the frontend and API together |
| `npm run dev:web`      | Run only the Vite frontend        |
| `npm run dev:api`      | Run only the NestJS API           |
| `npm run build`        | Build all workspaces              |
| `npm run lint`         | Lint all workspaces               |
| `npm run typecheck`    | Type-check all workspaces         |
| `npm run format`       | Format repository files           |
| `npm run format:check` | Check formatting without writing  |

## Local URLs

- Frontend: <http://localhost:3000>
- Backend: <http://localhost:3001>
- Health endpoint: <http://localhost:3001/api/health>

The health endpoint returns:

```json
{
  "status": "ok"
}
```

## Current status

This is the initial project foundation only. It includes a responsive temporary homepage, semantic design tokens, the first reusable UI component, environment conventions, and an operational API health route. No product features or database layer have been added.

See [the design system](docs/design-system.md) for the initial UI rules.
