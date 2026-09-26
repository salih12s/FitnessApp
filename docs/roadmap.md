# Roadmap

This file is the source of truth for planned work. Task prompts such as "implement phase 1" refer to the phases below. Implement one phase per task, keep each phase usable on its own, and do not start the next phase automatically.

## Status

| Phase | Title                      | Schema change | Status  |
| ----- | -------------------------- | ------------- | ------- |
| 0     | Precision redesign         | No            | Done    |
| 1     | Log corrections            | No            | Next    |
| 2     | Workout sessions           | Yes           | Planned |
| 3     | Advanced reports           | No            | Planned |
| 4     | Programs and templates     | Yes           | Planned |
| 5     | Profile and account        | Yes           | Planned |
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

## Later phases (summary)

Detailed specs are written when a phase starts.

- **Phase 2, workout sessions:** `WorkoutSession` model (start, end, note). Optional `ExerciseLog.sessionId`; existing logs stay without a session. "Antrenmana başla / bitir" flow. The history page groups logs by day and session.
- **Phase 3, advanced reports:** estimated 1RM per exercise (Epley: `weight × (1 + reps / 30)`), total volume, set and rep trends; weekly volume per muscle group shown as a heat map on the existing muscle artwork; summary panel (workouts this week, streak, recent records); a celebration when a new record is logged.
- **Phase 4, programs and templates:** `WorkoutTemplate` and `TemplateExercise` models with target sets, reps, and kg; start a session from a template with one tap (depends on phase 2); a calendar of sessions and planned days.
- **Phase 5, profile and account:** change password; sign out other sessions (refresh-session infrastructure exists); account deletion (needs a separate decision about workout history before implementation); `BodyMeasurement` model with charts; kg/lb display preference (always store kg); CSV export.
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
