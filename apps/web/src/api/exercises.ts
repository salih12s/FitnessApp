import { authorizedRequest } from '@/lib/api';
import { scopedApiPath } from '@/lib/client-scope';
import type {
  CreatedExerciseLog,
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
  clientId?: string,
): Promise<ExerciseSummary[]> {
  const query = new URLSearchParams({ q: searchQuery });

  return authorizedRequest(
    scopedApiPath(`/exercises/search?${query.toString()}`, clientId),
  );
}

export function getExercise(
  slug: string,
  isCustom = false,
  clientId?: string,
): Promise<ExerciseDetail> {
  return authorizedRequest(
    scopedApiPath(exerciseApiPath(slug, isCustom), clientId),
  );
}

export function getRecentExerciseLogs(
  slug: string,
  isCustom = false,
  clientId?: string,
): Promise<ExerciseLog[]> {
  const query = new URLSearchParams({ limit: '5' });

  const path = `${exerciseApiPath(slug, isCustom)}/logs`;
  return authorizedRequest(scopedApiPath(`${path}?${query}`, clientId));
}

export function createExerciseLog(
  slug: string,
  sets: ExerciseSetInput[],
  isCustom = false,
  clientId?: string,
): Promise<CreatedExerciseLog> {
  const path = `${exerciseApiPath(slug, isCustom)}/logs`;
  return authorizedRequest(scopedApiPath(path, clientId), {
    method: 'POST',
    body: JSON.stringify({ sets }),
  });
}

export function updateExerciseLog(
  id: string,
  sets: ExerciseSetInput[],
  clientId?: string,
): Promise<ExerciseLog> {
  return authorizedRequest(
    scopedApiPath(`/logs/${encodeURIComponent(id)}`, clientId),
    {
      method: 'PATCH',
      body: JSON.stringify({ sets }),
    },
  );
}

export function deleteExerciseLog(
  id: string,
  clientId?: string,
): Promise<void> {
  return authorizedRequest(
    scopedApiPath(`/logs/${encodeURIComponent(id)}`, clientId),
    {
      method: 'DELETE',
    },
  );
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

export function getHistory(
  request: HistoryRequest,
  clientId?: string,
): Promise<HistoryPage> {
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

  return authorizedRequest(
    scopedApiPath(`/history?${query.toString()}`, clientId),
  );
}
