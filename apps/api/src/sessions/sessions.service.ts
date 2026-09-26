import { Injectable, NotFoundException } from '@nestjs/common';

import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  templateExercisesSelect,
  type TemplateExerciseResponse,
  TemplatesService,
  toTemplateExerciseResponse,
} from '../templates/templates.service.js';

/** Sessions left active longer than this are finished automatically. */
export const STALE_SESSION_MS = 6 * 60 * 60 * 1000;

export interface SessionTemplateResponse {
  id: string;
  name: string;
  exercises: (TemplateExerciseResponse & { isDone: boolean })[];
}

export interface SessionResponse {
  id: string;
  /** The plan this session was started from, with per-exercise progress. */
  template: SessionTemplateResponse | null;
  startedAt: string;
  endedAt: string | null;
  note: string | null;
  exerciseCount: number;
  setCount: number;
  totalVolumeKg: string;
}

function sessionSelect(userId: string) {
  return {
    id: true,
    startedAt: true,
    endedAt: true,
    note: true,
    template: {
      select: {
        id: true,
        name: true,
        exercises: templateExercisesSelect(userId),
      },
    },
    exerciseLogs: {
      select: {
        exerciseId: true,
        performedAt: true,
        exerciseSets: { select: { weightKg: true, reps: true } },
      },
    },
  } satisfies Prisma.WorkoutSessionSelect;
}

type SessionRecord = Prisma.WorkoutSessionGetPayload<{
  select: ReturnType<typeof sessionSelect>;
}>;

function toSessionResponse(session: SessionRecord): SessionResponse {
  const sets = session.exerciseLogs.flatMap((log) => log.exerciseSets);
  const totalVolume = sets.reduce(
    (sum, set) => sum.add(set.weightKg.mul(set.reps)),
    new Prisma.Decimal(0),
  );

  const loggedExercises = new Set(
    session.exerciseLogs.map((log) => log.exerciseId),
  );

  return {
    id: session.id,
    template: session.template
      ? {
          id: session.template.id,
          name: session.template.name,
          exercises: session.template.exercises.map((row) => ({
            ...toTemplateExerciseResponse(row),
            isDone: loggedExercises.has(row.exercise.id),
          })),
        }
      : null,
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt?.toISOString() ?? null,
    note: session.note,
    exerciseCount: loggedExercises.size,
    setCount: sets.length,
    totalVolumeKg: totalVolume.toString(),
  };
}

function normalizeNote(note: string | undefined): string | null | undefined {
  if (note === undefined) return undefined;
  const trimmed = note.trim();
  return trimmed.length > 0 ? trimmed : null;
}

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly templatesService: TemplatesService,
  ) {}

  /**
   * Starts a session, optionally from one of the user's templates. An active
   * session is returned unchanged instead of starting a second one.
   */
  async start(userId: string, templateId?: string): Promise<SessionResponse> {
    const session = await this.prisma.client.$transaction(async (db) => {
      // Serializes concurrent starts for one user, so a double tap cannot
      // create two active sessions.
      await db.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;

      const active = await this.findActiveRecord(db, userId);
      if (active) return active;

      return db.workoutSession.create({
        data: {
          userId,
          templateId: templateId
            ? await this.templatesService.findOwnedId(db, userId, templateId)
            : null,
        },
        select: sessionSelect(userId),
      });
    });

    return toSessionResponse(session);
  }

  async findActive(userId: string): Promise<SessionResponse | null> {
    const session = await this.prisma.client.$transaction((db) =>
      this.findActiveRecord(db, userId),
    );

    return session ? toSessionResponse(session) : null;
  }

  /** The active session a new log should join, if any. */
  async activeSessionId(
    db: Prisma.TransactionClient,
    userId: string,
  ): Promise<string | null> {
    return (await this.findActiveRecord(db, userId))?.id ?? null;
  }

  async updateNote(
    userId: string,
    id: string,
    note: string,
  ): Promise<SessionResponse> {
    const session = await this.prisma.client.$transaction(async (db) => {
      await this.findOwned(db, userId, id);
      return db.workoutSession.update({
        where: { id },
        data: { note: normalizeNote(note) },
        select: sessionSelect(userId),
      });
    });

    return toSessionResponse(session);
  }

  /**
   * Ends the session. A session without logs has nothing worth keeping, so
   * it is deleted instead and `null` is returned.
   */
  async finish(
    userId: string,
    id: string,
    note?: string,
  ): Promise<SessionResponse | null> {
    const session = await this.prisma.client.$transaction(async (db) => {
      const existing = await this.findOwned(db, userId, id);

      if (existing.exerciseLogs.length === 0) {
        await db.workoutSession.deleteMany({ where: { id } });
        return null;
      }

      return db.workoutSession.update({
        where: { id },
        data: {
          // Finishing twice keeps the original end time.
          endedAt: existing.endedAt ?? new Date(),
          note: normalizeNote(note),
        },
        select: sessionSelect(userId),
      });
    });

    return session ? toSessionResponse(session) : null;
  }

  private async findOwned(
    db: Prisma.TransactionClient,
    userId: string,
    id: string,
  ): Promise<SessionRecord> {
    const session = await db.workoutSession.findFirst({
      where: { id, userId },
      select: sessionSelect(userId),
    });

    if (!session) {
      throw new NotFoundException('Workout session was not found.');
    }

    return session;
  }

  /** Returns the active session, finishing it first if it has gone stale. */
  private async findActiveRecord(
    db: Prisma.TransactionClient,
    userId: string,
  ): Promise<SessionRecord | null> {
    const session = await db.workoutSession.findFirst({
      where: { userId, endedAt: null },
      orderBy: { startedAt: 'desc' },
      select: sessionSelect(userId),
    });

    if (!session) return null;
    if (Date.now() - session.startedAt.getTime() <= STALE_SESSION_MS) {
      return session;
    }

    const lastPerformedAt = session.exerciseLogs.reduce<Date | null>(
      (latest, log) =>
        !latest || log.performedAt > latest ? log.performedAt : latest,
      null,
    );

    if (lastPerformedAt) {
      await db.workoutSession.updateMany({
        where: { id: session.id, endedAt: null },
        data: { endedAt: lastPerformedAt },
      });
    } else {
      await db.workoutSession.deleteMany({ where: { id: session.id } });
    }

    return null;
  }
}
