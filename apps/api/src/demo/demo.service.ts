import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import * as argon2 from 'argon2';

import { generateInviteCode } from '../coach/coach.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { PublicUser } from '../users/user.types.js';
import { publicUserSelect, UsersService } from '../users/users.service.js';
import {
  buildHistory,
  buildMeasurements,
  createRandom,
  DEMO_CLIENT_PROGRAM,
  DEMO_CUSTOM_EXERCISE,
  DEMO_OWNER_PROGRAMS,
  DEMO_SECOND_CLIENT_PROGRAMS,
  localWeekdayBit,
  weightForWeek,
  type DemoProgramPlan,
  type DemoWorkout,
} from './demo-data.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEMO_LIFETIME_MS = DAY_MS;
/** Each demo creates three users; the cap keeps repeated clicks bounded. */
const MAX_DEMO_USERS = 300;
const SUFFIX_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const MONDAY = 1;

type Db = Prisma.TransactionClient;

function randomSuffix(): string {
  return Array.from(
    { length: 6 },
    () => SUFFIX_ALPHABET[randomInt(SUFFIX_ALPHABET.length)],
  ).join('');
}

function daysAgo(now: Date, days: number): Date {
  return new Date(now.getTime() - days * DAY_MS);
}

/**
 * "Demo ile dene" creates a private sample account for each visitor: a coach
 * with three months of training, programs, measurements and two clients. A
 * visitor can change anything without affecting other visitors, and the
 * account is removed after a day.
 */
@Injectable()
export class DemoService {
  private readonly logger = new Logger(DemoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  async createAccount(): Promise<PublicUser> {
    await this.removeOldAccounts();

    const suffix = randomSuffix();
    // Nobody knows this password; demo accounts are entered only via the button.
    const passwordHash = await argon2.hash(
      randomBytes(32).toString('base64url'),
      { type: argon2.argon2id },
    );
    const now = new Date();
    const random = createRandom(randomInt(2 ** 31));

    return this.prisma.client.$transaction(
      async (db) => {
        const createUser = (username: string, isCoach: boolean) =>
          db.user.create({
            data: {
              username,
              passwordHash,
              isDemo: true,
              isCoach,
              coachInviteCode: isCoach ? generateInviteCode() : null,
            },
            select: publicUserSelect,
          });
        const owner = await createUser(`demo_${suffix}`, true);
        const firstClient = await createUser(`ada_${suffix}`, false);
        const secondClient = await createUser(`deniz_${suffix}`, false);
        const exerciseIds = await this.exerciseIds(db, owner.id);

        // The owner trains too and keeps the client plan as an unscheduled program.
        const ownerWeeks = 12;
        const ownerTemplates = await this.createTemplates(
          db,
          owner.id,
          [
            ...DEMO_OWNER_PROGRAMS,
            { ...DEMO_CLIENT_PROGRAM, scheduledDays: 0 },
          ],
          exerciseIds,
          ownerWeeks,
        );
        await this.createWorkouts(
          db,
          owner.id,
          ownerTemplates,
          buildHistory({
            programs: DEMO_OWNER_PROGRAMS,
            weeks: ownerWeeks,
            now,
            random,
            skipRate: 0.15,
          }),
          exerciseIds,
        );
        await this.createMeasurements(
          db,
          owner.id,
          buildMeasurements(
            {
              weightKg: [84.2, 80.6],
              bodyFatPercent: [19.5, 16.4],
              waistCm: [92, 87.5],
              chestCm: [101, 103],
              armCm: [36, 37.4],
            },
            ownerWeeks,
            now,
            random,
          ),
        );

        await db.coachClient.createMany({
          data: [
            {
              coachId: owner.id,
              clientId: firstClient.id,
              createdAt: daysAgo(now, 8 * 7),
            },
            {
              coachId: owner.id,
              clientId: secondClient.id,
              createdAt: daysAgo(now, 6 * 7),
            },
          ],
        });

        // First client: follows the coach's assigned program; the coach
        // entered the Monday workouts for them.
        const firstWeeks = 8;
        const firstTemplates = await this.createTemplates(
          db,
          firstClient.id,
          [DEMO_CLIENT_PROGRAM],
          exerciseIds,
          firstWeeks,
          owner.id,
        );
        const firstHistory = buildHistory({
          programs: [DEMO_CLIENT_PROGRAM],
          weeks: firstWeeks,
          now,
          random,
          skipRate: 0.1,
        });
        await this.createWorkouts(
          db,
          firstClient.id,
          firstTemplates,
          firstHistory.filter(
            (workout) => localWeekdayBit(workout.startedAt) !== MONDAY,
          ),
          exerciseIds,
        );
        await this.createWorkouts(
          db,
          firstClient.id,
          firstTemplates,
          firstHistory.filter(
            (workout) => localWeekdayBit(workout.startedAt) === MONDAY,
          ),
          exerciseIds,
          owner.id,
        );
        await this.createMeasurements(
          db,
          firstClient.id,
          buildMeasurements(
            { weightKg: [63.5, 61.2] },
            firstWeeks,
            now,
            random,
          ),
        );

        // Second client: own split, less regular, last trained a few days ago.
        const secondWeeks = 6;
        const secondTemplates = await this.createTemplates(
          db,
          secondClient.id,
          DEMO_SECOND_CLIENT_PROGRAMS,
          exerciseIds,
          secondWeeks,
        );
        await this.createWorkouts(
          db,
          secondClient.id,
          secondTemplates,
          buildHistory({
            programs: DEMO_SECOND_CLIENT_PROGRAMS,
            weeks: secondWeeks,
            now,
            random,
            skipRate: 0.3,
            restDays: 3,
          }),
          exerciseIds,
        );

        return owner;
      },
      { maxWait: 10_000, timeout: 30_000 },
    );
  }

  /** Library exercise ids by slug, plus the owner's new custom exercise. */
  private async exerciseIds(
    db: Db,
    ownerId: string,
  ): Promise<Map<string, string>> {
    const muscleGroup = await db.muscleGroup.findUniqueOrThrow({
      where: { slug: DEMO_CUSTOM_EXERCISE.muscleGroupSlug },
      select: { id: true },
    });
    const custom = await db.exercise.create({
      data: {
        name: DEMO_CUSTOM_EXERCISE.name,
        slug: DEMO_CUSTOM_EXERCISE.slug,
        slugNamespace: ownerId,
        equipment: DEMO_CUSTOM_EXERCISE.equipment,
        isCustom: true,
        createdByUserId: ownerId,
        muscleGroupId: muscleGroup.id,
      },
      select: { id: true },
    });
    const library = await db.exercise.findMany({
      where: { slugNamespace: 'global', isCustom: false },
      select: { id: true, slug: true },
    });

    return new Map([
      ...library.map(({ slug, id }) => [slug, id] as const),
      [DEMO_CUSTOM_EXERCISE.slug, custom.id],
    ]);
  }

  /** Returns the template ids in the order of `programs`. */
  private async createTemplates(
    db: Db,
    userId: string,
    programs: readonly DemoProgramPlan[],
    exerciseIds: Map<string, string>,
    weeks: number,
    assignedByUserId?: string,
  ): Promise<string[]> {
    const ids: string[] = [];
    for (const program of programs) {
      const template = await db.workoutTemplate.create({
        data: {
          userId,
          name: program.name,
          scheduledDays: program.scheduledDays,
          assignedByUserId,
          exercises: {
            create: program.exercises.map((plan, index) => ({
              exerciseId: requireExerciseId(exerciseIds, plan.slug),
              position: index + 1,
              targetSets: plan.sets,
              targetReps: plan.reps,
              targetWeightKg: weightForWeek(plan, weeks - 1).toFixed(2),
            })),
          },
        },
        select: { id: true },
      });
      ids.push(template.id);
    }
    return ids;
  }

  /**
   * Workouts become finished sessions. With `enteredByUserId` (a coach) the
   * logs are saved as coach entries without a session, as the app does.
   */
  private async createWorkouts(
    db: Db,
    userId: string,
    templateIds: string[],
    workouts: DemoWorkout[],
    exerciseIds: Map<string, string>,
    enteredByUserId?: string,
  ): Promise<void> {
    const sessions: Prisma.WorkoutSessionCreateManyInput[] = [];
    const logs: Prisma.ExerciseLogCreateManyInput[] = [];
    const sets: Prisma.ExerciseSetCreateManyInput[] = [];

    for (const workout of workouts) {
      const sessionId = enteredByUserId ? null : randomUUID();
      if (sessionId) {
        sessions.push({
          id: sessionId,
          userId,
          templateId: templateIds[workout.programIndex],
          startedAt: workout.startedAt,
          endedAt: workout.endedAt,
          note: workout.note,
          createdAt: workout.startedAt,
        });
      }

      for (const log of workout.logs) {
        const exerciseLogId = randomUUID();
        logs.push({
          id: exerciseLogId,
          userId,
          exerciseId: requireExerciseId(exerciseIds, log.slug),
          sessionId,
          enteredByUserId: enteredByUserId ?? null,
          performedAt: log.performedAt,
          notes: log.notes,
          createdAt: log.performedAt,
        });
        log.sets.forEach((set, index) =>
          sets.push({
            exerciseLogId,
            setNumber: index + 1,
            weightKg: set.weightKg,
            reps: set.reps,
            createdAt: log.performedAt,
          }),
        );
      }
    }

    await db.workoutSession.createMany({ data: sessions });
    await db.exerciseLog.createMany({ data: logs });
    await db.exerciseSet.createMany({ data: sets });
  }

  private async createMeasurements(
    db: Db,
    userId: string,
    measurements: ReturnType<typeof buildMeasurements>,
  ): Promise<void> {
    await db.bodyMeasurement.createMany({
      data: measurements.map((measurement) => ({ userId, ...measurement })),
    });
  }

  /**
   * Removes demo users older than a day and the oldest ones above the cap.
   * A failure here must not stop a visitor from getting a new demo.
   */
  private async removeOldAccounts(): Promise<void> {
    try {
      const cutoff = new Date(Date.now() - DEMO_LIFETIME_MS);
      const [expired, overflow] = await Promise.all([
        this.prisma.client.user.findMany({
          where: { isDemo: true, createdAt: { lt: cutoff } },
          select: { id: true },
        }),
        this.prisma.client.user.findMany({
          where: { isDemo: true },
          orderBy: { createdAt: 'desc' },
          skip: MAX_DEMO_USERS - 3,
          select: { id: true },
        }),
      ]);
      const ids = [...new Set([...expired, ...overflow].map(({ id }) => id))];
      if (ids.length === 0) return;

      await this.prisma.client.$transaction(
        (db) => this.users.deleteUsers(db, ids),
        { maxWait: 10_000, timeout: 30_000 },
      );
    } catch (error: unknown) {
      this.logger.warn(`Old demo accounts were not removed: ${String(error)}`);
    }
  }
}

function requireExerciseId(ids: Map<string, string>, slug: string): string {
  const id = ids.get(slug);
  if (!id) {
    throw new Error(`Demo exercise "${slug}" is missing from the library.`);
  }
  return id;
}
