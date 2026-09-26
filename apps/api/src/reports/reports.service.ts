import { Injectable, NotFoundException } from '@nestjs/common';

import {
  displayExerciseName,
  exerciseNameOverrideSelect,
  ownedExerciseWhere,
} from '../exercises/owned-exercise.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ReportRange } from './reports.dto.js';
import { formatCents, toCents, volumeCents } from './weight-math.js';

type SetRow = {
  id: string;
  setNumber: number;
  weightKg: { toString(): string };
  reps: number;
};

const DAY_MS = 86_400_000;

function localDayKey(time: number, offsetMinutes: number): string {
  return new Date(time + offsetMinutes * 60_000).toISOString().slice(0, 10);
}

/** Monday-based week number in the client's local time. */
function localWeekIndex(time: number, offsetMinutes: number): number {
  const localDay = Math.floor((time + offsetMinutes * 60_000) / DAY_MS);
  // Day 0 (1970-01-01) was a Thursday; shifting by 3 starts weeks on Monday.
  return Math.floor((localDay + 3) / 7);
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

  /**
   * Training summary for the last 7 days, the weekly streak, weekly volume
   * per muscle group, and the latest personal records. `offsetMinutes` is
   * the client's UTC offset so days and Monday-based weeks match its clock.
   */
  async findOverview(userId: string, offsetMinutes: number) {
    const now = Date.now();
    const since7Days = now - 7 * DAY_MS;
    const since14Days = now - 14 * DAY_MS;

    const [logs, muscleGroups] = await Promise.all([
      this.prisma.client.exerciseLog.findMany({
        where: { userId },
        orderBy: [{ performedAt: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
        select: {
          performedAt: true,
          exerciseId: true,
          exercise: {
            select: {
              name: true,
              slug: true,
              isCustom: true,
              muscleGroup: { select: { slug: true } },
              preferences: exerciseNameOverrideSelect(userId),
            },
          },
          exerciseSets: { select: { weightKg: true, reps: true } },
        },
      }),
      this.prisma.client.muscleGroup.findMany({
        orderBy: { name: 'asc' },
        select: { name: true, slug: true },
      }),
    ]);

    const workoutDays = new Set<string>();
    const trainedWeeks = new Set<number>();
    const muscleTotals = new Map<string, { volume: bigint; sets: number }>();
    const bestByExercise = new Map<string, bigint>();
    const records: {
      exercise: { name: string; slug: string; isCustom: boolean };
      weightKg: string;
      reps: number;
      previousKg: string;
      performedAt: string;
    }[] = [];
    let setCount = 0;
    let volume = 0n;
    let previousVolume = 0n;

    for (const log of logs) {
      const time = log.performedAt.getTime();
      const logVolume = volumeCents(log.exerciseSets);
      trainedWeeks.add(localWeekIndex(time, offsetMinutes));

      if (time >= since7Days) {
        workoutDays.add(localDayKey(time, offsetMinutes));
        setCount += log.exerciseSets.length;
        volume += logVolume;
        const slug = log.exercise.muscleGroup.slug;
        const total = muscleTotals.get(slug) ?? { volume: 0n, sets: 0 };
        total.volume += logVolume;
        total.sets += log.exerciseSets.length;
        muscleTotals.set(slug, total);
      } else if (time >= since14Days) {
        previousVolume += logVolume;
      }

      if (log.exerciseSets.length === 0) continue;
      const top = log.exerciseSets.reduce(
        (max, set) =>
          toCents(set.weightKg) > max ? toCents(set.weightKg) : max,
        toCents(log.exerciseSets[0].weightKg),
      );
      const previousBest = bestByExercise.get(log.exerciseId);

      // A record needs an earlier log to beat; the first log only sets a baseline.
      if (previousBest !== undefined && top > previousBest) {
        records.push({
          exercise: {
            name: displayExerciseName(log.exercise),
            slug: log.exercise.slug,
            isCustom: log.exercise.isCustom,
          },
          weightKg: formatCents(top),
          reps: Math.max(
            ...log.exerciseSets
              .filter((set) => toCents(set.weightKg) === top)
              .map((set) => set.reps),
          ),
          previousKg: formatCents(previousBest),
          performedAt: log.performedAt.toISOString(),
        });
      }
      if (previousBest === undefined || top > previousBest) {
        bestByExercise.set(log.exerciseId, top);
      }
    }

    // The streak stays alive through the current week until it ends.
    const currentWeek = localWeekIndex(now, offsetMinutes);
    let week = trainedWeeks.has(currentWeek) ? currentWeek : currentWeek - 1;
    let streakWeeks = 0;
    while (trainedWeeks.has(week)) {
      streakWeeks += 1;
      week -= 1;
    }

    return {
      last7Days: {
        workoutDays: workoutDays.size,
        setCount,
        volumeKg: formatCents(volume),
        previousVolumeKg: formatCents(previousVolume),
      },
      streakWeeks,
      muscleGroups: muscleGroups.map((group) => {
        const total = muscleTotals.get(group.slug);
        return {
          name: group.name,
          slug: group.slug,
          volumeKg: formatCents(total?.volume ?? 0n),
          setCount: total?.sets ?? 0,
        };
      }),
      recentRecords: records.slice(-5).reverse(),
    };
  }
}
