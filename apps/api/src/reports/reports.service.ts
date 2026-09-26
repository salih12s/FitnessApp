import { Injectable, NotFoundException } from '@nestjs/common';

import {
  displayExerciseName,
  exerciseNameOverrideSelect,
  ownedExerciseWhere,
} from '../exercises/owned-exercise.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ReportRange } from './reports.dto.js';

type SetRow = {
  id: string;
  setNumber: number;
  weightKg: { toString(): string };
  reps: number;
};

function toCents(value: string): bigint {
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * 100n + BigInt((fraction + '00').slice(0, 2));
}

function formatCents(value: bigint): string {
  const sign = value < 0n ? '-' : '';
  const absolute = value < 0n ? -value : value;
  const whole = absolute / 100n;
  const fraction = absolute % 100n;
  if (fraction === 0n) return `${sign}${whole}`;
  return `${sign}${whole}.${fraction.toString().padStart(2, '0').replace(/0+$/, '')}`;
}

function cutoffFor(range: ReportRange): Date | undefined {
  if (range === 'all') return undefined;
  const cutoff = new Date();
  if (range === '30d') cutoff.setDate(cutoff.getDate() - 30);
  else cutoff.setMonth(cutoff.getMonth() - (range === '6m' ? 6 : 3));
  return cutoff;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async findExercises(userId: string) {
    const latestLogs = await this.prisma.client.exerciseLog.groupBy({
      by: ['exerciseId'],
      where: { userId },
      _max: { performedAt: true },
    });
    const latestByExercise = new Map<string, Date>();
    for (const row of latestLogs) {
      if (row._max.performedAt) {
        latestByExercise.set(row.exerciseId, row._max.performedAt);
      }
    }

    const exercises = await this.prisma.client.exercise.findMany({
      where: { id: { in: [...latestByExercise.keys()] } },
      select: {
        id: true,
        name: true,
        slug: true,
        isCustom: true,
        muscleGroup: { select: { name: true, slug: true } },
        preferences: exerciseNameOverrideSelect(userId),
      },
    });

    return exercises
      .flatMap(({ preferences, ...exercise }) => {
        const latestPerformedAt = latestByExercise.get(exercise.id);
        const name = displayExerciseName({ ...exercise, preferences });
        return latestPerformedAt
          ? [{ ...exercise, name, latestPerformedAt }]
          : [];
      })
      .sort(
        (a, b) =>
          b.latestPerformedAt.getTime() - a.latestPerformedAt.getTime() ||
          a.name.localeCompare(b.name, 'tr-TR'),
      )
      .map((exercise) => ({
        ...exercise,
        latestPerformedAt: exercise.latestPerformedAt.toISOString(),
      }));
  }

  async findProgress(
    userId: string,
    slug: string,
    range: ReportRange,
    isCustom = false,
  ) {
    const exercise = await this.prisma.client.exercise.findFirst({
      where: ownedExerciseWhere(userId, slug, isCustom),
      select: {
        id: true,
        name: true,
        slug: true,
        isCustom: true,
        muscleGroup: { select: { name: true, slug: true } },
        preferences: exerciseNameOverrideSelect(userId),
      },
    });
    if (!exercise) throw new NotFoundException('Exercise not found.');
    const exerciseName = displayExerciseName(exercise);

    const cutoff = cutoffFor(range);
    const logs = await this.prisma.client.exerciseLog.findMany({
      where: {
        userId,
        exerciseId: exercise.id,
        ...(cutoff ? { performedAt: { gte: cutoff } } : {}),
      },
      orderBy: [{ performedAt: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        performedAt: true,
        exerciseSets: {
          orderBy: { setNumber: 'asc' },
          select: { id: true, setNumber: true, weightKg: true, reps: true },
        },
      },
    });

    const points = logs
      .filter((log) => log.exerciseSets.length > 0)
      .map((log) => {
        const sets = (log.exerciseSets as SetRow[]).map((set) => ({
          id: set.id,
          setNumber: set.setNumber,
          weightKg: set.weightKg.toString(),
          reps: set.reps,
        }));
        const maxWeightKg = sets.reduce(
          (max, set) =>
            toCents(set.weightKg) > toCents(max) ? set.weightKg : max,
          sets[0].weightKg,
        );
        return {
          id: log.id,
          performedAt: log.performedAt.toISOString(),
          maxWeightKg,
          sets,
        };
      });

    if (points.length === 0) {
      return {
        exercise: {
          name: exerciseName,
          slug: exercise.slug,
          muscleGroup: exercise.muscleGroup,
          isCustom: exercise.isCustom,
        },
        summary: null,
        points: [],
      };
    }

    const starting = toCents(points[0].maxWeightKg);
    const current = toCents(points[points.length - 1].maxWeightKg);
    const personalRecord = points.reduce((max, point) => {
      const weight = toCents(point.maxWeightKg);
      return weight > max ? weight : max;
    }, starting);
    const increase = current - starting;
    const improvementPercentage =
      starting === 0n
        ? null
        : Number(((Number(increase) / Number(starting)) * 100).toFixed(1));

    return {
      exercise: {
        name: exerciseName,
        slug: exercise.slug,
        muscleGroup: exercise.muscleGroup,
        isCustom: exercise.isCustom,
      },
      summary: {
        startingWeightKg: formatCents(starting),
        currentWeightKg: formatCents(current),
        personalRecordKg: formatCents(personalRecord),
        increaseKg: formatCents(increase),
        improvementPercentage,
      },
      points,
    };
  }
}
