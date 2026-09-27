# Development and deployment

Setup, local database, commands, and Hostinger deployment for FitnessApp. The product overview is in the [README](../README.md).

## Repository layout

```text
fitness-app/
├── apps/
│   ├── api/          # NestJS REST API, Prisma schema and migrations
│   └── web/          # React + Vite client (installable PWA)
├── docs/             # design system, database, roadmap, media
├── scripts/          # local MariaDB helper, Hostinger packaging
├── env-local.bat     # switch the API to the local database
└── package.json      # npm workspaces and root commands
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

## Local database (Windows)

`env-local.bat` in the repository root prepares everything for local development:

1. On the first run it downloads a portable MariaDB 11.4 into `%LOCALAPPDATA%\SercanFitness` (no administrator rights needed), creates the `fitness_app` database and a local user, and writes `apps/api/.env.local` with generated secrets.
2. It starts the local database if it is not running (it listens only on `127.0.0.1:3306`).
3. It copies `apps/api/.env.local` to `apps/api/.env`, applies migrations, and seeds the exercise library.

Then run `npm run dev`. Run `env-local.bat` again after a restart to start the database.

`env-hostinger.bat` switches `apps/api/.env` to `apps/api/.env.hostinger` and builds the upload package (see [Deploying to Hostinger](#deploying-to-hostinger)). Run `env-local.bat` to return to local development.

The database can also be managed directly:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\local-db.ps1 status   # or start, stop
```

The generated MariaDB root password is stored in `%LOCALAPPDATA%\SercanFitness\root-password.txt`.

## Environment setup

To configure the environment by hand instead (for example with your own MySQL server), copy the example files:

```powershell
Copy-Item apps/web/.env.example apps/web/.env
Copy-Item apps/api/.env.example apps/api/.env
```

Set `DATABASE_URL` to a MySQL connection string before running migrations or database-backed features:

```text
mysql://USER:PASSWORD@HOST:3306/DATABASE
```

Set the auth configuration in `apps/api/.env` as well:

```text
JWT_ACCESS_SECRET=<at-least-32-random-characters>
JWT_ACCESS_TTL_SECONDS=900
REFRESH_TOKEN_TTL_DAYS=30
REFRESH_COOKIE_SECURE=false
```

Use `REFRESH_COOKIE_SECURE=true` when the deployed API is served over HTTPS.

Never commit real secrets. Local `.env` files are ignored by Git.

## Development commands

| Command                                   | Purpose                                  |
| ----------------------------------------- | ---------------------------------------- |
| `npm run dev`                             | Run the frontend and API together        |
| `npm run dev:web`                         | Run only the Vite frontend               |
| `npm run dev:api`                         | Run only the NestJS API                  |
| `npm run build`                           | Build all workspaces                     |
| `npm run lint`                            | Lint all workspaces                      |
| `npm run typecheck`                       | Type-check all workspaces                |
| `npm run prisma:generate`                 | Generate the Prisma client               |
| `npm run prisma:validate`                 | Validate the Prisma schema               |
| `npm run prisma:migrate -- --name <name>` | Create and apply a development migration |
| `npm run prisma:migrate:deploy`           | Apply committed migrations in deployment |
| `npm run prisma:seed`                     | Idempotently seed initial reference data |
| `npm run format`                          | Format repository files                  |
| `npm run format:check`                    | Check formatting without writing         |

## Local URLs

- Frontend: <http://localhost:3005>
- Backend: <http://localhost:3001>
- Health endpoint: <http://localhost:3001/api/health>
- Database health endpoint: <http://localhost:3001/api/health/database>

The health endpoint returns:

```json
{
  "status": "ok"
}
```

## Deploying to Hostinger

The API serves the built web app, so one Hostinger Node.js web app hosts both.

1. Run `npm run package:hostinger`. It writes `deploy/fitness-app-hostinger.zip`.
2. Upload the zip in hPanel with the NestJS preset, Node.js 24, build command `npm run build`, output directory `dist`, and entry file `main.cjs` (NestJS entry files are relative to the output directory).
3. Set `DATABASE_URL` (`mysql://USER:PASSWORD@127.0.0.1:3306/DATABASE`), `JWT_ACCESS_SECRET`, `JWT_ACCESS_TTL_SECONDS`, `REFRESH_TOKEN_TTL_DAYS`, `REFRESH_COOKIE_SECURE=true`, and `FRONTEND_URL` as environment variables.
4. For a new database, import a SQL file with the schema, the seeded library, and the Prisma migration record through phpMyAdmin.
5. Before deploying a build that includes a new migration, apply it to the live database first. Run the new `apps/api/prisma/migrations/<timestamp>_<name>/migration.sql` in phpMyAdmin, then record it in `_prisma_migrations` (or run `npx prisma migrate deploy` from a machine that can reach the database). Test every migration on the local database (`env-local.bat`) before touching the live one. `20260926162620_add_workout_sessions` (workout sessions) is the first migration after the initial schema; `20260926173701_add_workout_templates` (programs) `20260926175210_add_profile_account` (weight unit and body measurements), and `20260927120000_add_coach_mode` (coach and client mode) follow it and must be applied in that order.
