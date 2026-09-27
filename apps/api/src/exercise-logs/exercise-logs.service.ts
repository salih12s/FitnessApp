import { Injectable, NotFoundException } from '@nestjs/common';

import {
  displayExerciseName,
  exerciseNameOverrideSelect,
  libraryExerciseWhere,
  ownedExerciseWhere,
} from '../exercises/owned-exercise.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { formatCents, toCents } from '../reports/weight-math.js';
import { SessionsService } from '../sessions/sessions.service.js';
import type { CreateExerciseLogDto } from './dto/create-exercise-log.dto.js';
import type { HistoryQueryDto } from './dto/history-query.dto.js';

export interface ExerciseLogSetResponse {
  setNumber: number;
  weightKg: string;
  reps: number;
}

export interface ExerciseLogResponse {
  id: string;
  performedAt: string;
  sets: ExerciseLogSetResponse[];
  /** The coach who entered the log for the user; null for own logs. */
  enteredBy: { id: string; username: string } | null;
}

export interface PersonalRecordResponse {
  weightKg: string;
  previousKg: string;
}

export interface CreatedExerciseLogResponse extends ExerciseLogResponse {
  /** Set when the heaviest set beats every earlier set of this exercise. */
  record: PersonalRecordResponse | null;
}

export interface HistoryLogSessionResponse {
  id: string;
  startedAt: string;
  endedAt: string | null;
  note: string | null;
}

export interface HistoryLogResponse extends ExerciseLogResponse {
  session: HistoryLogSessionResponse | null;
  exercise: {
    name: string;
    slug: string;
    muscleGroup: {
      name: string;
      slug: string;
    };
    isCustom: boolean;
  };
}

export interface HistoryResponse {
  items: HistoryLogResponse[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
}

const enteredBySelect = { select: { id: true, username: true } } as const;

const exerciseLogSelect = {
  id: true,
  performedAt: true,
  exerciseSets: {
    orderBy: { setNumber: 'asc' as const },
    select: {
      setNumber: true,
      weightKg: true,
      reps: true,
    },
  },
  enteredBy: enteredBySelect,
} as const;

const historyLogSelect = (userId: string) =>
  ({
    id: true,
    performedAt: true,
    exerciseSets: {
      orderBy: { setNumber: 'asc' as const },
      select: {
        setNumber: true,
        weightKg: true,
        reps: true,
      },
    },
    exercise: {
      select: {
        name: true,
        slug: true,
        isCustom: true,
        muscleGroup: { select: { name: true, slug: true } },
        preferences: exerciseNameOverrideSelect(userId),
      },
    },
    session: {
      select: { id: true, startedAt: true, endedAt: true, note: true },
    },
    enteredBy: enteredBySelect,
  }) as const;

@Injectable()
export class ExerciseLogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionsService: SessionsService,
  ) {}

  /** `enteredByUserId` is the linked coach when a coach logs for the user. */
  async create(
    userId: string,
    exerciseSlug: string,
    dto: CreateExerciseLogDto,
    enteredByUserId?: string,
  ): Promise<CreatedExerciseLogResponse> {
    return this.createForExercise(
      userId,
      exerciseSlug,
      dto,
      false,
      enteredByUserId,
    );
  }

  async createCustom(
    userId: string,
    exerciseSlug: string,
    dto: CreateExerciseLogDto,
    enteredByUserId?: string,
  ): Promise<CreatedExerciseLogResponse> {
    return this.createForExercise(
      userId,
      exerciseSlug,
      dto,
      true,
      enteredByUserId,
    );
  }

  async findRecent(
    userId: string,
    exerciseSlug: string,
    limit: number,
  ): Promise<ExerciseLogResponse[]> {
    return this.findRecentForExercise(userId, exerciseSlug, limit, false);
  }

  async findRecentCustom(
    userId: string,
    exerciseSlug: string,
    limit: number,
  ): Promise<ExerciseLogResponse[]> {
    return this.findRecentForExercise(userId, exerciseSlug, limit, true);
  }

  /**
   * Replaces a log's sets. With `enteredByUserId` (a coach acting for the
   * user), only logs that coach entered can be changed.
   */
  async update(
    userId: string,
    id: string,
    dto: CreateExerciseLogDto,
    enteredByUserId?: string,
  ): Promise<ExerciseLogResponse> {
    const exerciseLog = await this.prisma.client.$transaction(
      async (transaction) => {
        const existing = await transaction.exerciseLog.findFirst({
          where: { id, userId, enteredByUserId },
          select: { id: true },
        });

        if (!existing) {
          throw new NotFoundException('Workout log was not found.');
        }

        await transaction.exerciseSet.deleteMany({
          where: { exerciseLogId: id },
        });
        await transaction.exerciseSet.createMany({
          data: dto.sets.map((set, index) => ({
            exerciseLogId: id,
            setNumber: index + 1,
            weightKg: set.weightKg,
            reps: set.reps,
          })),
        });

        return transaction.exerciseLog.findUniqueOrThrow({
          where: { id },
          select: exerciseLogSelect,
        });
      },
    );

    return this.toResponse(exerciseLog);
  }

  async remove(
    userId: string,
    id: string,
    enteredByUserId?: string,
  ): Promise<void> {
    const result = await this.prisma.client.exerciseLog.deleteMany({
      where: { id, userId, enteredByUserId },
    });

    if (result.count === 0) {
      throw new NotFoundException('Workout log was not found.');
    }
  }

  private async createForExercise(
    userId: string,
    exerciseSlug: string,
    dto: CreateExerciseLogDto,
    isCustom: boolean,
    enteredByUserId?: string,
  ): Promise<CreatedExerciseLogResponse> {
    const { exerciseLog, previousBest } = await this.prisma.client.$transaction(
      async (transaction) => {
        const exercise = await transaction.exercise.findFirst({
          where: libraryExerciseWhere(userId, exerciseSlug, isCustom),
          select: { id: true },
        });

        if (!exercise) {
          throw new NotFoundException('Exercise was not found.');
        }

        // Logs saved during an active workout session belong to it.
        const sessionId = await this.sessionsService.activeSessionId(
          transaction,
          userId,
        );
        const previous = await transaction.exerciseSet.aggregate({
          _max: { weightKg: true },
          where: { exerciseLog: { userId, exerciseId: exercise.id } },
        });

        const created = await transaction.exerciseLog.create({
          data: {
            userId,
            exerciseId: exercise.id,
            sessionId,
            enteredByUserId,
            exerciseSets: {
              create: dto.sets.map((set, index) => ({
                setNumber: index + 1,
                weightKg: set.weightKg,
                reps: set.reps,
              })),
            },
          },
          select: exerciseLogSelect,
        });

        return { exerciseLog: created, previousBest: previous._max.weightKg };
      },
    );

    const top = dto.sets.reduce(
      (max, set) => (toCents(set.weightKg) > max ? toCents(set.weightKg) : max),
      0n,
    );
    const previousCents = previousBest ? toCents(previousBest) : null;

    return {
      ...this.toResponse(exerciseLog),
      record:
        previousCents !== null && top > previousCents
          ? {
              weightKg: formatCents(top),
              previousKg: formatCents(previousCents),
            }
          : null,
    };
  }

  private async findRecentForExercise(
    userId: string,
    exerciseSlug: string,
    limit: number,
    isCustom: boolean,
  ): Promise<ExerciseLogResponse[]> {
    const exercise = await this.prisma.client.exercise.findFirst({
      where: ownedExerciseWhere(userId, exerciseSlug, isCustom),
      select: { id: true },
    });

    if (!exercise) {
      throw new NotFoundException('Exercise was not found.');
    }

    const exerciseLogs = await this.prisma.client.exerciseLog.findMany({
      where: {
        userId,
        exerciseId: exercise.id,
      },
      orderBy: [{ performedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
      select: exerciseLogSelect,
    });

    return exerciseLogs.map((exerciseLog) => this.toResponse(exerciseLog));
  }

  async findHistory(
    userId: string,
    query: HistoryQueryDto,
  ): Promise<HistoryResponse> {
    const where = {
      userId,
      exercise: {
        ...(query.exercise
          ? ownedExerciseWhere(userId, query.exercise, query.custom)
          : {
              OR: [
                { slugNamespace: 'global', isCustom: false },
                { isCustom: true, createdByUserId: userId },
              ],
            }),
        ...(query.muscleGroup
          ? {
              muscleGroup: { slug: query.muscleGroup },
            }
          : {}),
      },
    };
    const skip = (query.page - 1) * query.limit;

    const [total, exerciseLogs] = await Promise.all([
      this.prisma.client.exerciseLog.count({ where }),
      this.prisma.client.exerciseLog.findMany({
        where,
        orderBy: [
          { performedAt: 'desc' },
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
        skip,
        take: query.limit,
        select: historyLogSelect(userId),
      }),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit);

    return {
      items: exerciseLogs.map((exerciseLog) =>
        this.toHistoryResponse(exerciseLog),
      ),
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
      hasNextPage: query.page < totalPages,
    };
  }

  private toResponse(exerciseLog: {
    id: string;
    performedAt: Date;
    exerciseSets: {
      setNumber: number;
      weightKg: { toString(): string };
      reps: number;
    }[];
    enteredBy: { id: string; username: string } | null;
  }): ExerciseLogResponse {
    return {
      id: exerciseLog.id,
      performedAt: exerciseLog.performedAt.toISOString(),
      sets: exerciseLog.exerciseSets.map((set) => ({
        setNumber: set.setNumber,
        weightKg: set.weightKg.toString(),
        reps: set.reps,
      })),
      enteredBy: exerciseLog.enteredBy,
    };
  }

  private toHistoryResponse(exerciseLog: {
    id: string;
    performedAt: Date;
    exerciseSets: {
      setNumber: number;
      weightKg: { toString(): string };
      reps: number;
    }[];
    exercise: {
      name: string;
      slug: string;
      isCustom: boolean;
      muscleGroup: { name: string; slug: string };
      preferences: { customName: string | null }[];
    };
    enteredBy: { id: string; username: string } | null;
    session: {
      id: string;
      startedAt: Date;
      endedAt: Date | null;
      note: string | null;
    } | null;
  }): HistoryLogResponse {
    const { session } = exerciseLog;

    return {
      ...this.toResponse(exerciseLog),
      session: session
        ? {
            id: session.id,
            startedAt: session.startedAt.toISOString(),
            endedAt: session.endedAt?.toISOString() ?? null,
            note: session.note,
          }
        : null,
      exercise: {
        name: displayExerciseName(exerciseLog.exercise),
        slug: exerciseLog.exercise.slug,
        muscleGroup: exerciseLog.exercise.muscleGroup,
        isCustom: exerciseLog.exercise.isCustom,
      },
    };
  }
}
