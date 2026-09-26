# Roadmap

This file is the source of truth for planned work. Task prompts such as "implement phase 1" refer to the phases below. Implement one phase per task, keep each phase usable on its own, and do not start the next phase automatically.

## Status

| Phase | Title                      | Schema change | Status  |
| ----- | -------------------------- | ------------- | ------- |
| 0     | Precision redesign         | No            | Done    |
| 1     | Log corrections            | No            | Done    |
| 2     | Workout sessions           | Yes           | Done    |
| 3     | Advanced reports           | No            | Done    |
| 4     | Programs and templates     | Yes           | Finish  |
| 5     | Profile and account        | Yes           | Next    |
| 6     | Coach and client mode      | Yes           | Planned |
| 7     | Offline logging (optional) | No            | Planned |

Update this table when a phase is finished.

## Rules for every phase

- Follow `AGENTS.md`, `docs/design-system.md` (UI), and `docs/database.md` (schema).
- UI copy is Turkish. Code, comments, and docs are English.
- Finish with `npm run format`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`, all passing.
- Schema-changing phases add a Prisma migration and update `docs/database.md`. Test migrations on the local database first (`env-local.bat`, see `README.md`), never directly on the live Hostinger database. Never delete or rewrite existing workout data.
- Add unit tests for new pure logic (for example validation or calculations) next to the existing `*.test.ts` files in `apps/web/src/lib`.

## Phase 1: Log corrections

No schema change. Three independent features.

### 1a. Edit and delete a workout log

API (`apps/api/src/exercise-logs`):

- Add a controller mounted at `logs` (so `/api/logs/:id`) protected by `AccessTokenGuard`, registered in `ExerciseLogsModule`. Keep it thin; logic goes in `ExerciseLogsService`.
- `PATCH /api/logs/:id` with the same body shape as `CreateExerciseLogDto` (`{ sets: [{ weightKg, reps }] }`, 1 to 50 sets). Reuse that DTO (or a type alias of it) rather than duplicating validation.
  - Inside one `$transaction`: find the log by `id` and `userId`; if not found, throw `NotFoundException` (do not reveal whether another user's log exists). Delete its `ExerciseSet` rows, create the new sets numbered from 1, and return the log in the existing `ExerciseLogResponse` shape.
  - `performedAt` and `exerciseId` do not change.
- `DELETE /api/logs/:id`: same ownership check, then delete the log (its sets cascade through the existing relation). Respond with `204 No Content`.
- Validate `:id` as a UUID (`ParseUUIDPipe`).

Web (`apps/web/src`):

- Add `updateExerciseLog(id, sets)` and `deleteExerciseLog(id)` to `api/exercises.ts`, following the existing request helpers in `lib/api.ts`.
- History page (`pages/history-page.tsx`, `HistoryLogCard`): add an edit and a delete action to each log card.
- Exercise page (`components/workouts/recent-workout.tsx`): add the same actions to the latest workout.
- Editing: open the sets inline in the card (no modal), reusing the set-row inputs and `validateWorkoutSets` from the workout entry section. Extract a shared set-editor component from `workout-entry-section.tsx` instead of copying it. Actions: `Vazgeç` and `Kaydet`.
- Deleting: inline confirmation inside the card, following the pattern in `components/common/exercise-manage-row.tsx` (question, short explanation, `Vazgeç` and a destructive `Sil`). Never use `window.confirm`.
- After either mutation, invalidate the same queries the create flow invalidates (exercise logs, `['history']`, report exercises, report details).
- Show a plain-language inline error if the request fails.

### 1b. Prefill the entry form with the last workout

- On the exercise page, when the latest log exists (already fetched by `getRecentExerciseLogs`), start the set editor with that log's sets (same weights and reps, same number of sets) instead of one empty row.
- Show a small hint above the rows: `Geçen sefer: 80 kg × 8, 8, 7` (mono numbers, per the design system), using the real latest log.
- Provide a `Temizle` text action that resets to one empty row.
- After a successful save, prefill again from the log that was just saved.
- With no history, keep today's behavior (one empty row).

### 1c. Rest timer

Frontend only; no API or storage on the server.

- After a successful save, show a rest-timer card under the entry form with a `Dinlenmeyi başlat` action. It never starts on its own.
- Durations: presets 60, 90, 120, and 180 seconds, default 90. Remember the last chosen duration in `localStorage` (wrap access in try/catch, like `lib/theme.ts`).
- While running: large mono countdown (`1:24`), a circular or linear progress indicator using the accent, `+15 sn` and `Atla` actions.
- At zero: vibrate (`navigator.vibrate([200, 100, 200])` when supported), show a finished state (`Dinlenme bitti`), and announce it through an `aria-live="polite"` region.
- Timing must stay correct when the tab is in the background: compute remaining time from a stored end timestamp, not by counting ticks.
- Put the countdown math in a small pure module (for example `lib/rest-timer.ts`) with unit tests.
- Respect `prefers-reduced-motion` for the progress animation.

### Done when

- A user can edit and delete only their own logs; another user's log id returns 404.
- History, exercise page, and reports reflect edits and deletions without a reload.
- The entry form opens with the last workout's sets.
- The rest timer counts down correctly, including after switching tabs, and vibrates at the end on supported phones.
- Everything works at 375px in light and dark themes.

## Phase 2: Workout sessions

Schema change. Groups the exercises a user logs in one visit to the gym into a session. Logging without a session keeps working exactly as today.

### 2a. Schema

- New model `WorkoutSession` (table `workout_sessions`), following the conventions in `docs/database.md` (UUID `Char(36)` ids, snake_case column names, `DateTime(3)`):
  - `id`, `userId` (required, `onDelete: Restrict`), `startedAt` (default now), `endedAt` (nullable; null means the session is active), `note` (nullable `Text`), `createdAt`, `updatedAt`.
  - Index `(userId, startedAt DESC)`.
- `ExerciseLog.sessionId`: nullable, relation to `WorkoutSession` with `onDelete: SetNull` so removing a session can never remove workout history. Index `sessionId`. Existing rows stay `null`; the migration must not touch existing data.
- A user has at most one active session. MySQL has no partial unique index, so enforce this in the service inside a transaction.
- Create the migration with `npm run prisma:migrate -- --name add_workout_sessions` against the local database (`env-local.bat` first). Update `docs/database.md` (relationship tree, entities, deletion behavior) and add a short README note that this migration must be applied on Hostinger before deploying the new build.

### 2b. API

New `sessions` module (thin controller, logic in a service, `AccessTokenGuard`, ownership by `userId` exactly like phase 1, `ParseUUIDPipe` on ids, 404 for sessions of other users):

- `POST /api/sessions`: start a session. If the user already has an active session, return it instead of creating a second one (idempotent, safe against double taps).
- `GET /api/sessions/active`: `{ session: SessionResponse | null }`.
- `PATCH /api/sessions/:id`: update `note` (max 1000 characters).
- `POST /api/sessions/:id/finish`: optional `note`; sets `endedAt` to now and responds `{ session }`. If the session has no logs, delete it instead (nothing to keep) and respond `{ session: null }`.
- `SessionResponse`: `id`, `startedAt`, `endedAt`, `note`, `exerciseCount`, `setCount`, `totalVolumeKg` (sum of `weightKg × reps` as a decimal string, like other weights).
- Stale sessions: a session active for more than 6 hours is finished automatically the next time the user starts a session or reads the active session. Its `endedAt` becomes the `performedAt` of its last log, or `startedAt` when it has none (then delete it, as above).
- Logging: `ExerciseLogsService` create flow attaches the new log to the user's active session when there is one. The request body does not change.
- History: each `HistoryLogResponse` gains `session: { id, startedAt, endedAt, note } | null`.

### 2c. Web

- Active-session bar in `AppShell`, visible on every signed-in page while a session is active: elapsed time as a mono clock (`32:14`, computed from `startedAt`, not by counting ticks), the number of exercises logged, and a `Bitir` action. On mobile it sits directly above the bottom navigation; on desktop, at the top of the content area. Page bottom padding must grow so it never covers content.
- Home page: when no session is active, a primary `Antrenmana başla` action near the top. Starting a session keeps the user on the home page so they can pick a muscle group.
- Exercise page: while a session is active, show a one-line note in the entry card that the log will be added to the current session.
- Finish flow (inline panel or bottom sheet, not a browser dialog): summary with duration, exercises, sets, and total volume; optional note field; `Antrenmanı bitir` and `Vazgeç`. After finishing, show a short confirmation.
- History page: keep the day groups. Inside a day, logs that share a session appear under one session header: time range (`18:05 - 19:02`), duration, exercise count, total volume, and the note when present. Logs without a session keep today's card layout.
- Put the grouping (day, then session) and duration formatting in pure modules under `lib/` with unit tests.
- Invalidate or update the active-session query after logging, editing, or deleting a log so counts stay correct.

### Done when

- A user can start, use, and finish a session; logs saved during it are grouped in history.
- Logging without a session works as before, and all existing logs still appear.
- Double-tapping start creates one session; a session left open overnight is closed automatically.
- Another user's session ids return 404.
- The migration applies cleanly on a copy of the current local database, and `docs/database.md` is updated.
- Everything works at 375px in light and dark themes.

## Phase 3: Advanced reports (done)

No schema change.

- `GET /api/reports/overview?offset=<minutes>`: last 7 days (training days, sets, volume, and the previous 7 days' volume), consecutive Monday-based training weeks, last-7-days volume per muscle group, and the five latest personal records (a log whose heaviest set beats every earlier set of that exercise). `offset` is the client's UTC offset so days and weeks follow its clock.
- Creating a log returns `record: { weightKg, previousKg } | null`; the entry form celebrates a new record.
- Reports page: overview tiles, a muscle heat map on the anatomy artwork (with a text list so color is never the only signal), recent records, and an exercise chart that switches between top weight, estimated 1RM (Epley: `weight × (1 + reps / 30)`), and volume. The home page shows the overview tiles.

## Phase 4: Programs and templates (code complete, finish the checklist)

Implemented (migration `20260926173701_add_workout_templates`, applied locally):

- `WorkoutTemplate` (name, `scheduledDays` weekday bitmask Monday = 1 ... Sunday = 64) and `TemplateExercise` (position, target sets, reps, optional kg). Plan rows cascade with their template or exercise; `WorkoutSession.templateId` is `SET NULL`, so deleting a template never touches history.
- API: `GET/POST /api/templates`, `PUT/DELETE /api/templates/:id` (owner-only, 404 otherwise; exercises must be global or the user's own custom ones), `POST /api/sessions { templateId? }`, session responses include `template` with per-exercise `isDone`, and `GET /api/reports/calendar?month=YYYY-MM&offset=<minutes>`.
- Web: "Programlar" navigation item, `/app/programs` list (start, edit, delete with inline confirmation), `/app/programs/new` and `/app/programs/:id` editor, plan checklist in the active-session bar, entry form prefilled with the plan target, and a "Liste / Takvim" switch on the history page (trained days filled, planned days outlined, day details with a start button for today).
- API behavior was verified with scripted requests (ownership 404s, validation 400s, start from template, `isDone`, calendar totals, delete keeps sessions).

Remaining before marking it done:

1. Check the new screens in the browser at 375px and desktop, light and dark: programs list, editor (add, reorder, remove, validation), session bar checklist, template-prefilled entry form, calendar. The bottom navigation now has five items; make sure "Antrenmanlar" fits at 375px.
2. Update `docs/database.md` (relationship tree, entities, deletion behavior, indexes) for `WorkoutTemplate`, `TemplateExercise`, and `WorkoutSession.templateId`.
3. Run the full verification and set this phase to Done.

## Phase 5: Profile and account

Decided: deleting an account removes everything (logs, sessions, templates, custom exercises, preferences, measurements, refresh sessions). It requires the current password and typing `hesabımı sil`, and the page offers CSV export first.

- **Change password:** `POST /api/auth/change-password { currentPassword, newPassword }` (argon2 verify, same rules as registration); revoke every other refresh session, keep the current one.
- **Sign out other devices:** `POST /api/auth/logout-others` revokes all refresh sessions except the one in the request cookie; the profile shows how many other sessions are active.
- **Delete account:** `DELETE /api/users/me { password, confirmation }` deletes the user's data in one transaction in dependency order (sets via logs, logs, sessions, templates, measurements, preferences, refresh sessions, custom exercises, then the user), clears the refresh cookie, and the web app signs out.
- **Body measurements:** new `BodyMeasurement` model (user, `measuredAt` date, optional `weightKg` DECIMAL(5,2), `bodyFatPercent` DECIMAL(4,1), `waistCm`, `chestCm`, `armCm` DECIMAL(5,1), note; `onDelete: Restrict` on user like other history) with list/create/delete endpoints; profile section with a form, a body-weight trend chart (reuse the reports chart style), and the latest values.
- **kg / lb:** `User.weightUnit` (`kg` default, `lb`). Storage stays in kg; convert only for display and input (1 lb = 0.45359237 kg, round stored kg to 2 decimals). Route every weight display and input through `lib/format.ts` so the unit switch is one place.
- **CSV export:** `GET /api/export/logs.csv` streams all of the user's sets (date, exercise, muscle group, set, weight_kg, reps, session start, session note) with a UTF-8 BOM so Excel shows Turkish characters; the web downloads it with the auth header via a blob URL.
- Migration, `docs/database.md`, unit tests for conversions, and the usual verification.

## Later phases (summary)

Detailed specs are written when a phase starts.

- **Phase 6, coach and client mode:** see the decisions below. `CoachClient` relation created through an invite code or link that the client accepts; the client can remove a coach at any time; coach dashboard with client list, last activity, and progress summary; coaches can assign phase 4 templates. Ownership checks in existing services gain "or a linked coach". Later: coach comments on logs.
- **Phase 7, offline logging (optional):** queue logs in IndexedDB while offline and send them when the connection returns.

## Decisions already made

Coach and client mode (phase 6):

- One account can be both athlete and coach; there is no separate coach account type.
- Any user can turn on coach mode themselves; no admin approval.
- A coach can view a linked client's history and reports and can also enter logs on the client's behalf. Store who entered each log so the client can see it (a nullable "entered by" user reference on `ExerciseLog`; existing logs stay null).
- A coach can edit or delete only the logs they entered, never the client's own logs.
- A client can link to several coaches; each link is separate and removable by the client.

General:

- Keep the phase order above.
- Test migrations on the local database before the live Hostinger database.
