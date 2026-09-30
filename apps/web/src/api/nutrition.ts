import { authorizedRequest } from '@/lib/api';
import type {
  BatchFoodItem,
  CatalogFood,
  FoodEntry,
  FoodEntryInput,
  FoodEntryUpdate,
  FoodLibrary,
  GoalInput,
  Meal,
  NutritionDay,
  NutritionFeatures,
  NutritionGoal,
  NutritionSummary,
  PhotoAnalysis,
} from '@/types/nutrition';

export const nutritionKeys = {
  all: ['nutrition'] as const,
  day: (date: string) => ['nutrition', 'day', date] as const,
  summary: (to: string, days: number) =>
    ['nutrition', 'summary', to, days] as const,
  foods: ['nutrition', 'foods'] as const,
  features: ['nutrition', 'features'] as const,
  catalog: (query: string) => ['nutrition', 'catalog', query] as const,
  packaged: (query: string) => ['nutrition', 'packaged', query] as const,
};

const json = (body: unknown): RequestInit => ({
  body: JSON.stringify(body),
});

export function getNutritionDay(date: string): Promise<NutritionDay> {
  return authorizedRequest(`/nutrition/days/${encodeURIComponent(date)}`);
}

export function getNutritionSummary(
  to: string,
  days: number,
): Promise<NutritionSummary> {
  const query = new URLSearchParams({ to, days: String(days) });
  return authorizedRequest(`/nutrition/summary?${query.toString()}`);
}

export function createFoodEntry(input: FoodEntryInput): Promise<FoodEntry> {
  return authorizedRequest('/nutrition/entries', {
    method: 'POST',
    ...json(input),
  });
}

export function updateFoodEntry(
  id: string,
  input: FoodEntryUpdate,
): Promise<FoodEntry> {
  return authorizedRequest(`/nutrition/entries/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    ...json(input),
  });
}

export function deleteFoodEntry(id: string): Promise<void> {
  return authorizedRequest(`/nutrition/entries/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function copyFoodEntries(input: {
  fromDate: string;
  toDate: string;
  meal?: Meal;
}): Promise<{ copied: number }> {
  return authorizedRequest('/nutrition/copy', {
    method: 'POST',
    ...json(input),
  });
}

export function setNutritionGoal(input: GoalInput): Promise<NutritionGoal> {
  return authorizedRequest('/nutrition/goal', {
    method: 'PUT',
    ...json(input),
  });
}

export function clearNutritionGoal(): Promise<void> {
  return authorizedRequest('/nutrition/goal', { method: 'DELETE' });
}

export function getFoodLibrary(): Promise<FoodLibrary> {
  return authorizedRequest('/nutrition/foods');
}

export function deleteSavedFood(id: string): Promise<void> {
  return authorizedRequest(`/nutrition/foods/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function getNutritionFeatures(): Promise<NutritionFeatures> {
  return authorizedRequest('/nutrition/features');
}

export async function searchCatalog(query: string): Promise<CatalogFood[]> {
  const params = new URLSearchParams({ q: query });
  const response = await authorizedRequest<{ results: CatalogFood[] }>(
    `/nutrition/catalog?${params.toString()}`,
  );
  return response.results;
}

export async function searchPackagedFoods(
  query: string,
): Promise<CatalogFood[]> {
  const params = new URLSearchParams({ q: query });
  const response = await authorizedRequest<{ results: CatalogFood[] }>(
    `/nutrition/catalog/packaged?${params.toString()}`,
  );
  return response.results;
}

export function createFoodEntries(input: {
  eatenOn: string;
  meal: Meal;
  items: BatchFoodItem[];
}): Promise<{ created: number }> {
  return authorizedRequest('/nutrition/entries/batch', {
    method: 'POST',
    ...json(input),
  });
}

/** Sends the photo as raw image bytes; the server does not store it. */
export function analyzeMealPhoto(photo: Blob): Promise<PhotoAnalysis> {
  return authorizedRequest('/nutrition/photo-analysis', {
    method: 'POST',
    body: photo,
    headers: { 'Content-Type': photo.type || 'image/jpeg' },
  });
}
