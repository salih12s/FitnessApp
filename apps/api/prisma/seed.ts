import 'dotenv/config';

import { PrismaMariaDb } from '@prisma/adapter-mariadb';

import { PrismaClient } from '../src/generated/prisma/client.js';
import {
  CURATED_EXERCISES,
  CURATED_EXERCISE_COUNTS,
  type MuscleGroupSlug,
} from '../src/exercises/exercise-library.js';
import { INITIAL_MUSCLE_GROUPS } from '../src/muscle-groups/muscle-group.constants.js';
import { toMariaDbConfig } from '../src/prisma/database-url.js';

const connectionString = process.env.DATABASE_URL?.trim();

if (!connectionString) {
  throw new Error('DATABASE_URL is required to seed the database.');
}

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(toMariaDbConfig(connectionString)),
});

function assertCuratedLibrary(): void {
  const names = new Set<string>();
  const slugs = new Set<string>();
  const counts = Object.fromEntries(
    INITIAL_MUSCLE_GROUPS.map(({ slug }) => [slug, 0]),
  ) as Record<MuscleGroupSlug, number>;

  for (const exercise of CURATED_EXERCISES) {
    const normalizedName = exercise.name.trim().toLowerCase();

    if (names.has(normalizedName) || slugs.has(exercise.slug)) {
      throw new Error(`Duplicate curated exercise: ${exercise.name}.`);
    }

    names.add(normalizedName);
    slugs.add(exercise.slug);
    counts[exercise.muscleGroup] += 1;
  }

  if (CURATED_EXERCISES.length < 120 || CURATED_EXERCISES.length > 140) {
    throw new Error('The curated exercise library must contain 120–140 items.');
  }

  for (const [slug, expectedCount] of Object.entries(
    CURATED_EXERCISE_COUNTS,
  ) as [MuscleGroupSlug, number][]) {
    if (counts[slug] !== expectedCount) {
      throw new Error(
        `Expected ${expectedCount} exercises for ${slug}, found ${counts[slug]}.`,
      );
    }
  }
}

try {
  assertCuratedLibrary();

  await prisma.$transaction(
    async (transaction) => {
      for (const muscleGroup of INITIAL_MUSCLE_GROUPS) {
        await transaction.muscleGroup.upsert({
          where: { name: muscleGroup.name },
          update: { slug: muscleGroup.slug },
          create: muscleGroup,
        });
      }

      const muscleGroups = await transaction.muscleGroup.findMany({
        select: { id: true, slug: true },
      });
      const muscleGroupIds = new Map(
        muscleGroups.map(({ id, slug }) => [slug, id]),
      );

      for (const exercise of CURATED_EXERCISES) {
        const muscleGroupId = muscleGroupIds.get(exercise.muscleGroup);

        if (!muscleGroupId) {
          throw new Error(
            `Muscle group ${exercise.muscleGroup} was not seeded.`,
          );
        }

        await transaction.exercise.upsert({
          where: {
            slugNamespace_slug: {
              slugNamespace: 'global',
              slug: exercise.slug,
            },
          },
          update: {
            name: exercise.name,
            description: exercise.instructions,
            equipment: exercise.equipment,
            imageUrl: null,
            isCustom: false,
            createdByUserId: null,
            muscleGroupId,
          },
          create: {
            name: exercise.name,
            slug: exercise.slug,
            slugNamespace: 'global',
            description: exercise.instructions,
            equipment: exercise.equipment,
            isCustom: false,
            muscleGroupId,
          },
        });
      }
    },
    { timeout: 60_000 },
  );

  console.log(
    `Seeded ${INITIAL_MUSCLE_GROUPS.length} muscle groups and ${CURATED_EXERCISES.length} exercises.`,
  );
} finally {
  await prisma.$disconnect();
}
