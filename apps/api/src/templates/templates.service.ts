import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  displayExerciseName,
  exerciseNameOverrideSelect,
} from '../exercises/owned-exercise.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { TemplateDto } from './template.dto.js';

export interface TemplateExerciseResponse {
  position: number;
  exercise: {
    id: string;
    name: string;
    slug: string;
    isCustom: boolean;
    muscleGroup: { name: string; slug: string };
  };
  targetSets: number;
  targetReps: number;
  targetWeightKg: string | null;
}

export interface TemplateResponse {
  id: string;
  name: string;
  scheduledDays: number;
  lastUsedAt: string | null;
  /** The coach who assigned this template; null for the user's own. */
  assignedBy: { id: string; username: string } | null;
  exercises: TemplateExerciseResponse[];
}

/** Template exercises with the user's display names, in plan order. */
export function templateExercisesSelect(userId: string) {
  return {
    orderBy: { position: 'asc' as const },
    select: {
      position: true,
      targetSets: true,
      targetReps: true,
      targetWeightKg: true,
      exercise: {
        select: {
          id: true,
          name: true,
          slug: true,
          isCustom: true,
          muscleGroup: { select: { name: true, slug: true } },
          preferences: exerciseNameOverrideSelect(userId),
        },
      },
    },
  } satisfies Prisma.WorkoutTemplate$exercisesArgs;
}

type TemplateExerciseRecord = Prisma.TemplateExerciseGetPayload<{
  select: ReturnType<typeof templateExercisesSelect>['select'];
}>;

export function toTemplateExerciseResponse(
  row: TemplateExerciseRecord,
): TemplateExerciseResponse {
  const { preferences, ...exercise } = row.exercise;

  return {
    position: row.position,
    exercise: {
      ...exercise,
      name: displayExerciseName({ name: exercise.name, preferences }),
    },
    targetSets: row.targetSets,
    targetReps: row.targetReps,
    targetWeightKg: row.targetWeightKg?.toString() ?? null,
  };
}

function templateSelect(userId: string) {
  return {
    id: true,
    name: true,
    scheduledDays: true,
    assignedBy: { select: { id: true, username: true } },
    exercises: templateExercisesSelect(userId),
    sessions: {
      orderBy: { startedAt: 'desc' as const },
      take: 1,
      select: { startedAt: true },
    },
  } satisfies Prisma.WorkoutTemplateSelect;
}

type TemplateRecord = Prisma.WorkoutTemplateGetPayload<{
  select: ReturnType<typeof templateSelect>;
}>;

function toTemplateResponse(template: TemplateRecord): TemplateResponse {
  return {
    id: template.id,
    name: template.name,
    scheduledDays: template.scheduledDays,
    lastUsedAt: template.sessions[0]?.startedAt.toISOString() ?? null,
    assignedBy: template.assignedBy,
    exercises: template.exercises.map(toTemplateExerciseResponse),
  };
}

function exerciseRows(dto: TemplateDto) {
  return dto.exercises.map((exercise, index) => ({
    exerciseId: exercise.exerciseId,
    position: index + 1,
    targetSets: exercise.targetSets,
    targetReps: exercise.targetReps,
    targetWeightKg: exercise.targetWeightKg ?? null,
  }));
}

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<TemplateResponse[]> {
    const templates = await this.prisma.client.workoutTemplate.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: templateSelect(userId),
    });

    return templates.map(toTemplateResponse);
  }

  async create(userId: string, dto: TemplateDto): Promise<TemplateResponse> {
    const template = await this.prisma.client.$transaction(async (db) => {
      await this.assertExercisesAvailable(db, userId, dto);
      return db.workoutTemplate.create({
        data: {
          userId,
          name: dto.name,
          scheduledDays: dto.scheduledDays,
          exercises: { create: exerciseRows(dto) },
        },
        select: templateSelect(userId),
      });
    });

    return toTemplateResponse(template);
  }

  /** Replaces the template's name, schedule, and every planned exercise. */
  async update(
    userId: string,
    id: string,
    dto: TemplateDto,
  ): Promise<TemplateResponse> {
    const template = await this.prisma.client.$transaction(async (db) => {
      await this.findOwnedId(db, userId, id);
      await this.assertExercisesAvailable(db, userId, dto);
      await db.templateExercise.deleteMany({ where: { templateId: id } });
      return db.workoutTemplate.update({
        where: { id },
        data: {
          name: dto.name,
          scheduledDays: dto.scheduledDays,
          exercises: { create: exerciseRows(dto) },
        },
        select: templateSelect(userId),
      });
    });

    return toTemplateResponse(template);
  }

  /** Deletes the plan only; sessions started from it keep their logs. */
  async remove(userId: string, id: string): Promise<void> {
    const result = await this.prisma.client.workoutTemplate.deleteMany({
      where: { id, userId },
    });

    if (result.count === 0) {
      throw new NotFoundException('Workout template was not found.');
    }
  }

  /**
   * Copies one of the coach's templates into a linked client's programs.
   * The copy belongs to the client; the coach's custom exercises are not in
   * the client's library, so templates using them are rejected.
   */
  async assignToClient(
    coachId: string,
    templateId: string,
    clientId: string,
  ): Promise<TemplateResponse> {
    const template = await this.prisma.client.$transaction(async (db) => {
      const source = await db.workoutTemplate.findFirst({
        where: { id: templateId, userId: coachId },
        select: {
          name: true,
          scheduledDays: true,
          exercises: {
            orderBy: { position: 'asc' },
            select: {
              exerciseId: true,
              position: true,
              targetSets: true,
              targetReps: true,
              targetWeightKg: true,
              exercise: { select: { isCustom: true } },
            },
          },
        },
      });

      if (!source) {
        throw new NotFoundException('Workout template was not found.');
      }
      if (source.exercises.some((row) => row.exercise.isCustom)) {
        throw new BadRequestException(
          'Templates with custom exercises cannot be assigned.',
        );
      }

      return db.workoutTemplate.create({
        data: {
          userId: clientId,
          assignedByUserId: coachId,
          name: source.name,
          scheduledDays: source.scheduledDays,
          exercises: {
            create: source.exercises.map((row) => ({
              exerciseId: row.exerciseId,
              position: row.position,
              targetSets: row.targetSets,
              targetReps: row.targetReps,
              targetWeightKg: row.targetWeightKg,
            })),
          },
        },
        select: templateSelect(clientId),
      });
    });

    return toTemplateResponse(template);
  }

  async findOwnedId(
    db: Prisma.TransactionClient,
    userId: string,
    id: string,
  ): Promise<string> {
    const template = await db.workoutTemplate.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!template) {
      throw new NotFoundException('Workout template was not found.');
    }

    return template.id;
  }

  /** Templates may use global exercises and the user's own custom ones. */
  private async assertExercisesAvailable(
    db: Prisma.TransactionClient,
    userId: string,
    dto: TemplateDto,
  ): Promise<void> {
    const ids = [...new Set(dto.exercises.map((row) => row.exerciseId))];
    const available = await db.exercise.count({
      where: {
        id: { in: ids },
        OR: [
          { slugNamespace: 'global', isCustom: false },
          { isCustom: true, createdByUserId: userId },
        ],
      },
    });

    if (available !== ids.length) {
      throw new BadRequestException(
        'An exercise in the template was not found.',
      );
    }
  }
}
