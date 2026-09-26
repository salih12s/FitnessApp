import { authorizedRequest } from '@/lib/api';
import type {
  ExerciseDetail,
  ExerciseLog,
  ExerciseSetInput,
  ExerciseSummary,
} from '@/types/exercise';
import type { HistoryPage } from '@/types/history';

export const exerciseKeys = {
  byMuscleGroup: (slug: string) => ['exercises', 'muscle-group', slug] as const,
  search: (query: string) => ['exercises', 'search', query] as const,
  detail: (slug: string, isCustom = false) =>
    ['exercises', 'detail', slug, isCustom] as const,
  logs: (slug: string, isCustom = false) =>
    ['exercises', 'logs', slug, isCustom] as const,
};

function exerciseApiPath(slug: string, isCustom: boolean): string {
  return isCustom
    ? `/exercises/custom/${encodeURIComponent(slug)}`
    : `/exercises/${encodeURIComponent(slug)}`;
}

export function getExercisesByMuscleGroup(
  muscleGroupSlug: string,
): Promise<ExerciseSummary[]> {
  const query = new URLSearchParams({ muscleGroup: muscleGroupSlug });

  return authorizedRequest(`/exercises?${query.toString()}`);
}

export function searchExercises(
  searchQuery: string,
): Promise<ExerciseSummary[]> {
  const query = new URLSearchParams({ q: searchQuery });

  return authorizedRequest(`/exercises/search?${query.toString()}`);
}

export function getExercise(
  slug: string,
  isCustom = false,
): Promise<ExerciseDetail> {
  return authorizedRequest(exerciseApiPath(slug, isCustom));
}

export function getRecentExerciseLogs(
  slug: string,
  isCustom = false,
): Promise<ExerciseLog[]> {
  const query = new URLSearchParams({ limit: '5' });

  const path = `${exerciseApiPath(slug, isCustom)}/logs`;
  return authorizedRequest(`${path}?${query}`);
}

export function createExerciseLog(
  slug: string,
  sets: ExerciseSetInput[],
  isCustom = false,
): Promise<ExerciseLog> {
  const path = `${exerciseApiPath(slug, isCustom)}/logs`;
  return authorizedRequest(path, {
    method: 'POST',
    body: JSON.stringify({ sets }),
  });
}

export function updateExerciseLog(
  id: string,
  sets: ExerciseSetInput[],
): Promise<ExerciseLog> {
  return authorizedRequest(`/logs/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ sets }),
  });
}

export function deleteExerciseLog(id: string): Promise<void> {
  return authorizedRequest(`/logs/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function renameExercise(
  exercise: Pick<ExerciseSummary, 'slug' | 'isCustom'>,
  name: string,
): Promise<ExerciseSummary> {
  return authorizedRequest(exerciseApiPath(exercise.slug, exercise.isCustom), {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });
}

export function deleteExercise(
  exercise: Pick<ExerciseSummary, 'slug' | 'isCustom'>,
): Promise<void> {
  return authorizedRequest(exerciseApiPath(exercise.slug, exercise.isCustom), {
    method: 'DELETE',
  });
}

export interface CreateCustomExerciseInput {
  name: string;
  muscleGroup: string;
  equipment: string;
  instructions?: string;
}

export function createCustomExercise(
  input: CreateCustomExerciseInput,
): Promise<ExerciseDetail> {
  return authorizedRequest('/exercises/custom', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export interface HistoryRequest {
  page: number;
  limit?: number;
  exercise?: string;
  isCustom?: boolean;
  muscleGroup?: string;
}

export function getHistory(request: HistoryRequest): Promise<HistoryPage> {
  const query = new URLSearchParams({
    page: String(request.page),
    limit: String(request.limit ?? 20),
  });

  if (request.exercise) {
    query.set('exercise', request.exercise);
    query.set('custom', String(request.isCustom ?? false));
  }

  if (request.muscleGroup) {
    query.set('muscleGroup', request.muscleGroup);
  }

  return authorizedRequest(`/history?${query.toString()}`);
}
