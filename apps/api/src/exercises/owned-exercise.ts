import type { Prisma } from '../generated/prisma/client.js';

/**
 * Matches the exercise a user may address by slug: a global exercise, or a
 * custom exercise the user created. Custom slugs live in the owner's namespace.
 */
export function ownedExerciseWhere(
  userId: string,
  slug: string,
  isCustom: boolean,
): Prisma.ExerciseWhereInput {
  return isCustom
    ? { slugNamespace: userId, slug, isCustom: true, createdByUserId: userId }
    : { slugNamespace: 'global', slug, isCustom: false };
}

/** Excludes exercises the user removed from their library. */
export function notHiddenWhere(userId: string): Prisma.ExerciseWhereInput {
  return { preferences: { none: { userId, hiddenAt: { not: null } } } };
}

/**
 * Matches an exercise that is still in the user's library. Removed exercises
 * stay reachable through `ownedExerciseWhere` so history and reports remain.
 */
export function libraryExerciseWhere(
  userId: string,
  slug: string,
  isCustom: boolean,
): Prisma.ExerciseWhereInput {
  return {
    ...ownedExerciseWhere(userId, slug, isCustom),
    ...notHiddenWhere(userId),
  };
}

/** Selects the user's display-name override for an exercise. */
export function exerciseNameOverrideSelect(userId: string) {
  return {
    where: { userId },
    select: { customName: true },
    take: 1,
  } as const;
}

export function displayExerciseName(exercise: {
  name: string;
  preferences: { customName: string | null }[];
}): string {
  return exercise.preferences[0]?.customName ?? exercise.name;
}
