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
├── set-local-env.bat     # switch the API to the local database
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

`set-local-env.bat` in the repository root prepares everything for local development:

1. On the first run it downloads a portable MariaDB 11.4 into `%LOCALAPPDATA%\SercanFitness` (no administrator rights needed), creates the `fitness_app` database and a local user, and writes `apps/api/.env.local` with generated secrets.
2. It starts the local database if it is not running (it listens only on `127.0.0.1:3306`).
3. It copies `apps/api/.env.local` to `apps/api/.env`, applies migrations, and seeds the exercise library.

Then run `npm run dev`. Run `set-local-env.bat` again after a restart to start the database.

`set-production-env.bat` switches `apps/api/.env` to `apps/api/.env.hostinger` and builds the upload package (see [Deploying to Hostinger](#deploying-to-hostinger)). Run `set-local-env.bat` to return to local development.

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

### Nutrition: food search and photo analysis

The nutrition page needs no extra configuration except for one optional feature.

- **Food search ("Besin ara")** works out of the box. The built-in catalog is part of the API code. The "Paketli ürünlerde ara" button calls Open Food Facts from the server (no key; results are cached for an hour and limited to 20 requests a minute per IP). If that service is down, the button shows a message and everything else keeps working.
- **Photo analysis ("Fotoğraf")** estimates a meal's calories and macros from a photo with Claude. It is off until the API has a key, and the tab is hidden while it is off. To turn it on, put a key from the [Claude Console](https://console.anthropic.com/) in `apps/api/.env.local` (and in the Hostinger environment variables):

  ```text
  ANTHROPIC_API_KEY=<your key>
  # Optional. The default is claude-opus-5-5; claude-sonnet-5-5 costs less.
  ANTHROPIC_MODEL=claude-opus-5-5
  # Optional spend limits per UTC day (defaults 15 per user and 300 for the whole site).
  PHOTO_ANALYSIS_DAILY_LIMIT=15
  PHOTO_ANALYSIS_GLOBAL_DAILY_LIMIT=300
  ```

  Every analysis is a paid API call. Demo accounts get 3 a day. The app shrinks the photo to 1280 px in the browser, the server checks that it is a real JPEG, PNG, or WebP of at most 4 MB, and the photo is sent to Anthropic for that one request and never stored or logged. The answer is bounded and cleaned in `photo-analysis.ts` before it reaches the user, and the user reviews and edits it before anything is saved. Restart the API after changing these variables.

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
3. Set `DATABASE_URL` (`mysql://USER:PASSWORD@127.0.0.1:3306/DATABASE`), `JWT_ACCESS_SECRET`, `JWT_ACCESS_TTL_SECONDS`, `REFRESH_TOKEN_TTL_DAYS`, `REFRESH_COOKIE_SECURE=true`, and `FRONTEND_URL` as environment variables. Also set `TRUST_PROXY_HOPS` to the number of proxies in front of the app (rate limits use the client IP), and optionally `ANTHROPIC_API_KEY` for meal photo analysis (see [Nutrition](#nutrition-food-search-and-photo-analysis)).
4. For a new database, import a SQL file with the schema, the seeded library, and the Prisma migration record through phpMyAdmin.
5. Before deploying a build that includes a new migration, apply it to the live database first. Run the new `apps/api/prisma/migrations/<timestamp>_<name>/migration.sql` in phpMyAdmin, then record it in `_prisma_migrations` (or run `npx prisma migrate deploy` from a machine that can reach the database). Test every migration on the local database (`set-local-env.bat`) before touching the live one. `20260926162620_add_workout_sessions` (workout sessions) is the first migration after the initial schema; `20260926173701_add_workout_templates` (programs) `20260926175210_add_profile_account` (weight unit and body measurements), `20260927120000_add_coach_mode` (coach and client mode), `20260928162505_add_demo_accounts` (demo accounts), and `20260930002622_add_nutrition` (food diary, favorites, and nutrition goal) follow it and must be applied in that order.
6. The login page offers **Demo hesabıyla dene**: `POST /api/auth/demo` creates a private sample account (a coach with three months of training, programs, measurements and two clients) for each visitor. Demo users are marked with `users.is_demo`; they are removed after 24 hours, and at most 300 demo users are kept.
