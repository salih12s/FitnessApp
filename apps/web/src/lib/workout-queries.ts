import type { QueryClient } from '@tanstack/react-query';

import { exerciseKeys } from '@/api/exercises';
import { reportKeys } from '@/api/reports';

export function invalidateWorkoutQueries(
  queryClient: QueryClient,
  exerciseSlug: string,
  isCustom: boolean,
): Promise<unknown[]> {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: exerciseKeys.logs(exerciseSlug, isCustom),
    }),
    queryClient.invalidateQueries({ queryKey: ['history'] }),
    queryClient.invalidateQueries({ queryKey: reportKeys.exercises }),
    queryClient.invalidateQueries({ queryKey: ['reports', 'detail'] }),
  ]);
}
