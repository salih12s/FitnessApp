import { Injectable, NotFoundException } from '@nestjs/common';

import type { Prisma } from '../generated/prisma/client.js';
import { notHiddenWhere } from '../exercises/owned-exercise.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { INITIAL_MUSCLE_GROUPS } from './muscle-group.constants.js';

export interface MuscleGroupResponse {
  id: string;
  name: string;
  slug: string;
  exerciseCount: number;
}

const initialOrder = new Map<string, number>(
  INITIAL_MUSCLE_GROUPS.map(({ slug }, index) => [slug, index]),
);

/** Counts the exercises the user sees in the library for each group. */
function libraryWhere(userId: string): Prisma.ExerciseWhereInput {
  return {
    OR: [
      { isCustom: false, slugNamespace: 'global' },
      { isCustom: true, createdByUserId: userId },
    ],
    ...notHiddenWhere(userId),
  };
}

@Injectable()
export class MuscleGroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string): Promise<MuscleGroupResponse[]> {
    const muscleGroups = await this.prisma.client.muscleGroup.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { exercises: { where: libraryWhere(userId) } } },
      },
    });

    return muscleGroups
      .map((muscleGroup) => this.toResponse(muscleGroup))
      .sort((left, right) => {
        const orderDifference =
          (initialOrder.get(left.slug) ?? Number.MAX_SAFE_INTEGER) -
          (initialOrder.get(right.slug) ?? Number.MAX_SAFE_INTEGER);

        return orderDifference || left.name.localeCompare(right.name, 'tr-TR');
      });
  }

  async findBySlug(userId: string, slug: string): Promise<MuscleGroupResponse> {
    const muscleGroup = await this.prisma.client.muscleGroup.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { exercises: { where: libraryWhere(userId) } } },
      },
    });

    if (!muscleGroup) {
      throw new NotFoundException('Muscle group was not found.');
    }

    return this.toResponse(muscleGroup);
  }

  private toResponse(muscleGroup: {
    id: string;
    name: string;
    slug: string;
    _count: { exercises: number };
  }): MuscleGroupResponse {
    return {
      id: muscleGroup.id,
      name: muscleGroup.name,
      slug: muscleGroup.slug,
      exerciseCount: muscleGroup._count.exercises,
    };
  }
}
