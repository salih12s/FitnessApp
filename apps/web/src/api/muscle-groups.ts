import { authorizedRequest } from '@/lib/api';
import type { MuscleGroup } from '@/types/muscle-group';

export const muscleGroupKeys = {
  all: ['muscle-groups'] as const,
  detail: (slug: string) => ['muscle-groups', slug] as const,
};

export function getMuscleGroups(): Promise<MuscleGroup[]> {
  return authorizedRequest('/muscle-groups');
}

export function getMuscleGroup(slug: string): Promise<MuscleGroup> {
  return authorizedRequest(`/muscle-groups/${encodeURIComponent(slug)}`);
}
