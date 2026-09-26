# FitnessApp Database

FitnessApp uses MySQL (MariaDB compatible) through Prisma ORM and the `@prisma/adapter-mariadb` driver adapter. Tables use `utf8mb4_unicode_ci`, so text comparisons and exercise search are case-insensitive. The schema and services enforce authentication ownership, relational boundaries, and per-set workout history.

## Relationships

```text
User
├── Custom Exercise
├── ExercisePreference
├── ExerciseLog
│   └── ExerciseSet
├── WorkoutSession
│   └── ExerciseLog (optional)
└── RefreshSession

Exercise
├── MuscleGroup
└── ExerciseLog

MuscleGroup
└── Exercise
```

Each `Exercise` belongs to exactly one required `MuscleGroup` through `Exercise.muscleGroupId`. This direct relationship keeps library browsing, history, and reports unambiguous.

The idempotent Prisma seed creates the initial muscle groups with stable URL-safe slugs: `gogus`, `sirt`, `omuz`, `biceps`, `triceps`, `on-kol`, `bacak`, and `karin`. It upserts the controlled global exercise library by `(slugNamespace, slug)` without replacing IDs. Re-running the seed updates canonical content without creating duplicate exercises.

The exercise library currently contains 125 practical commercial-gym exercises. Category totals are: Göğüs 17, Sırt 19, Omuz 15, Biceps 13, Triceps 13, Ön Kol 9, Bacak 24, and Karın 15.

## Entities

- **User:** Identified by a UUID with a unique, lowercase username (3-20 letters, digits, `.` or `_`) and password hash. Accounts created before usernames existed received one derived from their former email address. Plain-text passwords must never be stored.
- **RefreshSession:** One independently revocable login session. Only a SHA-256 hash of its high-entropy refresh credential is stored; the raw credential exists only in an `HttpOnly` cookie.
- **MuscleGroup:** A uniquely named and uniquely slugged classification.
- **Exercise:** A global or user-owned exercise with one required muscle group, instructions, and optional equipment/media fields. `isCustom` and nullable `createdByUserId` distinguish user-owned exercises.
- **ExercisePreference:** One user's customization of one exercise, unique per `(userId, exerciseId)`: an optional display-name override (`customName`) and an optional `hiddenAt` marker for exercises removed from that user's library.
- **ExerciseLog:** One historical exercise performance belonging to exactly one user and exercise, optionally inside a workout session.
- **WorkoutSession:** One visit to the gym, owned by one user, with `startedAt`, a nullable `endedAt` (null while the session is active), and an optional note. A user has at most one active session; `SessionsService` enforces this inside a transaction that locks the user row, because MySQL has no partial unique index. Logs created while a session is active get its `sessionId`. Logs created outside a session, including every log from before sessions existed, keep `sessionId` null. A session active for more than 6 hours is finished automatically at its last log's time the next time the user reads or starts a session; one without logs is deleted instead, as is a session finished without logs.
- **ExerciseSet:** One ordered set within an exercise log, with its own weight and repetition count.

`ExerciseLog` contains session-level context such as exercise, user, date, and notes. `ExerciseSet` is separate because each set can use a different weight and repetition count. Set order is determined by `setNumber`, which is unique within its log. Queries should order sets by `setNumber ASC`.

Workout creation accepts an ordered set array and assigns contiguous set numbers on the server. The authenticated user ID always comes from the verified access token. The log and all of its sets are created in one transaction so a partial workout cannot remain if any write fails. Recent-log queries must filter by both authenticated `userId` and `exerciseId`.

The reports API does not persist a separate analytics model. For each `ExerciseLog`, it derives one progression point from the greatest `weightKg` in that log and includes the ordered sets for point details. Starting, current, personal-record, and increase values are calculated from the authenticated user's selected date range.

The application service keeps `isCustom`, `createdByUserId`, and `slugNamespace` consistent: global exercises have no owner and use the default `global` namespace, while custom exercises have an owner and use that user's ID as their namespace.

Exercise slugs are unique within a namespace through `(slugNamespace, slug)`. System exercises therefore remain globally identifiable, while two different users may own custom exercises with the same human-readable slug. A single user cannot create the same slug twice.

Exercise discovery returns every global exercise and only custom exercises owned by the authenticated user. Custom-detail, workout-log, history, and report queries retain the same ownership boundary.

## Weight representation

`ExerciseSet.weightKg` uses MySQL `DECIMAL(6,2)` through Prisma `Decimal`. Values such as `10`, `12.5`, `17.5`, and `22.75` are represented exactly without floating-point rounding errors. Workout input accepts `0` kg for bodyweight movements, but rejects negative values and more than two decimal places.

## Deletion and updates

User, exercise, and muscle-group relationships use `RESTRICT` on delete. Users with custom exercises or logs, exercises with muscle relationships or logs, and muscle groups still used by exercises cannot be silently deleted. Future deletion workflows must explicitly archive, reassign, or remove dependent data. This protects workout history from accidental cascades.

Renaming or deleting an exercise from the library never changes the shared global row. It writes an `ExercisePreference` for the authenticated user, so other users keep the original library. Library listing, search, detail, muscle-group counts, and new workout logs exclude hidden exercises; history and reports keep showing them with the user's display name so past logs stay intact. A custom exercise with no workout logs is deleted outright; one with logs is hidden instead.

Deleting an `ExerciseLog` cascades only to its `ExerciseSet` children because sets have no meaning outside their parent log.

`ExerciseLog.sessionId` uses `SET NULL` on delete: removing a `WorkoutSession` detaches its logs and never deletes workout history. `WorkoutSession.userId` uses `RESTRICT`, like other user-owned history.

Deleting a `User` cascades to its `RefreshSession` and `ExercisePreference` records because sessions and display preferences have no meaning without the account. Deleting an `Exercise` cascades to its `ExercisePreference` records for the same reason. Historical exercise relationships retain their restrictive deletion behavior.

Foreign keys cascade identifier updates so references remain consistent, although UUID identifiers should normally be immutable.

## Indexes

- Unique indexes cover username, muscle-group name/slug, and exercise namespace/slug.
- Refresh-session credential hashes are unique. Its user index supports per-account session management, and its expiry index supports cleanup of expired sessions.
- `Exercise.createdByUserId` supports future custom-exercise ownership queries.
- `Exercise(muscleGroupId)` supports exercise discovery by muscle group.
- `ExercisePreference(userId, exerciseId)` is unique and supports per-user lookups; `ExercisePreference(exerciseId)` supports the exercise foreign key.
- `ExerciseLog(userId, performedAt DESC)` supports a user's chronological history.
- `ExerciseLog(userId, exerciseId, performedAt DESC)` supports the authenticated user's recent history for one exercise.
- `ExerciseLog(exerciseId, performedAt DESC)` supports progress history for an exercise.
- `ExerciseLog(performedAt)` supports date-range queries across logs.
- `ExerciseLog(sessionId)` supports loading a session's logs and the session foreign key.
- `WorkoutSession(userId, startedAt DESC)` supports finding a user's active and recent sessions.
- `ExerciseSet(exerciseLogId, setNumber)` is unique, prevents duplicate set positions, and supports ordered set lookup without an additional redundant index.

Every log query must be scoped to the authenticated user so one user's history is never returned to another user.
