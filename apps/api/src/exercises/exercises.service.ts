import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateCustomExerciseDto } from './dto/create-custom-exercise.dto.js';
import { rankExercises } from './exercise-search.js';
import {
  displayExerciseName,
  exerciseNameOverrideSelect,
  libraryExerciseWhere,
  notHiddenWhere,
} from './owned-exercise.js';

interface MuscleReference {
  name: string;
  slug: string;
}

export interface ExerciseSummaryResponse {
  id: string;
  name: string;
  slug: string;
  equipment: string | null;
  muscleGroup: MuscleReference;
  isCustom: boolean;
}

export interface ExerciseDetailResponse extends ExerciseSummaryResponse {
  instructions: string | null;
}

const exerciseSummarySelect = {
  id: true,
  name: true,
  slug: true,
  equipment: true,
  isCustom: true,
  muscleGroup: { select: { name: true, slug: true } },
} as const;

function slugify(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function hasPrismaCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}

function withDisplayName<
  T extends { name: string; preferences: { customName: string | null }[] },
>({ preferences, ...exercise }: T): Omit<T, 'preferences'> {
  return {
    ...exercise,
    name: displayExerciseName({ ...exercise, preferences }),
  };
}

function byLibraryOrder(
  left: ExerciseSummaryResponse,
  right: ExerciseSummaryResponse,
): number {
  return (
    Number(left.isCustom) - Number(right.isCustom) ||
    left.name.localeCompare(right.name, 'tr-TR')
  );
}

@Injectable()
export class ExercisesService {
  constructor(private readonly prisma: PrismaService) {}

  async findByMuscleGroup(
    userId: string,
    muscleGroupSlug: string,
  ): Promise<ExerciseSummaryResponse[]> {
    const muscleGroup = await this.prisma.client.muscleGroup.findUnique({
      where: { slug: muscleGroupSlug },
      select: { id: true },
    });

    if (!muscleGroup) {
      throw new NotFoundException('Muscle group was not found.');
    }

    const exercises = await this.prisma.client.exercise.findMany({
      where: {
        muscleGroupId: muscleGroup.id,
        OR: [
          { isCustom: false, slugNamespace: 'global' },
          { isCustom: true, createdByUserId: userId },
        ],
        ...notHiddenWhere(userId),
      },
      select: {
        ...exerciseSummarySelect,
        preferences: exerciseNameOverrideSelect(userId),
      },
    });

    return exercises.map(withDisplayName).sort(byLibraryOrder);
  }

  async search(
    userId: string,
    query: string,
  ): Promise<ExerciseSummaryResponse[]> {
    // The whole visible library is small, so ranking happens in memory (see
    // exercise-search.ts) rather than with SQL LIKE.
    const exercises = await this.prisma.client.exercise.findMany({
      where: {
        OR: [
          { isCustom: false, slugNamespace: 'global' },
          { isCustom: true, createdByUserId: userId },
        ],
        ...notHiddenWhere(userId),
      },
      // Equal scores keep this order, so results are stable.
      orderBy: [{ isCustom: 'asc' }, { name: 'asc' }],
      select: {
        ...exerciseSummarySelect,
        description: true,
        preferences: exerciseNameOverrideSelect(userId),
      },
    });

    const searchable = exercises.map((exercise) => {
      const { id, slug, equipment, isCustom, muscleGroup, description } =
        exercise;
      return {
        id,
        slug,
        equipment,
        isCustom,
        muscleGroup,
        description,
        name: displayExerciseName(exercise),
        originalName: exercise.name,
      };
    });

    return rankExercises(searchable, query).map(
      ({ id, name, slug, equipment, isCustom, muscleGroup }) => ({
        id,
        name,
        slug,
        equipment,
        muscleGroup,
        isCustom,
      }),
    );
  }

  async findBySlug(
    userId: string,
    slug: string,
    isCustom: boolean,
  ): Promise<ExerciseDetailResponse> {
    const exercise = await this.prisma.client.exercise.findFirst({
      where: libraryExerciseWhere(userId, slug, isCustom),
      select: {
        ...exerciseSummarySelect,
        description: true,
        preferences: exerciseNameOverrideSelect(userId),
      },
    });

    if (!exercise) {
      throw new NotFoundException('Exercise was not found.');
    }

    const { description, ...summary } = withDisplayName(exercise);
    return { ...summary, instructions: description };
  }

  async rename(
    userId: string,
    slug: string,
    isCustom: boolean,
    name: string,
  ): Promise<ExerciseSummaryResponse> {
    const exercise = await this.findLibraryExercise(userId, slug, isCustom);
    const customName = name === exercise.name ? null : name;

    await this.prisma.client.exercisePreference.upsert({
      where: { userId_exerciseId: { userId, exerciseId: exercise.id } },
      create: { userId, exerciseId: exercise.id, customName },
      update: { customName },
    });

    return { ...exercise, name };
  }

  /**
   * Removes an exercise from the user's library. A custom exercise without
   * any workout history is deleted; otherwise it is hidden so past logs and
   * reports keep their exercise.
   */
  async remove(userId: string, slug: string, isCustom: boolean): Promise<void> {
    const exercise = await this.findLibraryExercise(userId, slug, isCustom);

    if (isCustom) {
      const logCount = await this.prisma.client.exerciseLog.count({
        where: { exerciseId: exercise.id },
      });
      if (logCount === 0) {
        try {
          await this.prisma.client.exercise.delete({
            where: { id: exercise.id },
          });
          return;
        } catch (error) {
          // A workout was logged meanwhile; fall back to hiding it.
          if (!hasPrismaCode(error, 'P2003')) throw error;
        }
      }
    }

    await this.prisma.client.exercisePreference.upsert({
      where: { userId_exerciseId: { userId, exerciseId: exercise.id } },
      create: { userId, exerciseId: exercise.id, hiddenAt: new Date() },
      update: { hiddenAt: new Date() },
    });
  }

  private async findLibraryExercise(
    userId: string,
    slug: string,
    isCustom: boolean,
  ): Promise<ExerciseSummaryResponse> {
    const exercise = await this.prisma.client.exercise.findFirst({
      where: libraryExerciseWhere(userId, slug, isCustom),
      select: exerciseSummarySelect,
    });

    if (!exercise) {
      throw new NotFoundException('Exercise was not found.');
    }

    return exercise;
  }

  async createCustom(
    userId: string,
    dto: CreateCustomExerciseDto,
  ): Promise<ExerciseDetailResponse> {
    const slug = slugify(dto.name);
    if (!slug) {
      throw new ConflictException(
        'Hareket adı geçerli bir slug oluşturmalıdır.',
      );
    }

    const muscleGroup = await this.prisma.client.muscleGroup.findUnique({
      where: { slug: dto.muscleGroup },
      select: { id: true },
    });
    if (!muscleGroup) {
      throw new NotFoundException('Muscle group was not found.');
    }

    try {
      const exercise = await this.prisma.client.exercise.create({
        data: {
          name: dto.name,
          slug,
          slugNamespace: userId,
          description: dto.instructions || null,
          equipment: dto.equipment,
          isCustom: true,
          createdByUserId: userId,
          muscleGroupId: muscleGroup.id,
        },
        select: { ...exerciseSummarySelect, description: true },
      });
      const { description, ...summary } = exercise;
      return { ...summary, instructions: description };
    } catch (error) {
      if (hasPrismaCode(error, 'P2002')) {
        throw new ConflictException('Bu hareketi zaten ekledin.');
      }
      throw error;
    }
  }
}
