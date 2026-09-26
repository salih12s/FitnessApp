import type { ExerciseSummary } from '@/types/exercise';

export function exercisePath(
  exercise: Pick<ExerciseSummary, 'isCustom' | 'slug'>,
): string {
  return exercise.isCustom
    ? `/app/exercises/custom/${exercise.slug}`
    : `/app/exercises/${exercise.slug}`;
}
