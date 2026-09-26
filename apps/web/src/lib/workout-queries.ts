import type { QueryClient } from '@tanstack/react-query';

import { exerciseKeys } from '@/api/exercises';
import { reportKeys } from '@/api/reports';
import { sessionKeys } from '@/api/sessions';

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
    queryClient.invalidateQueries({ queryKey: reportKeys.overview }),
    queryClient.invalidateQueries({ queryKey: ['reports', 'detail'] }),
    // Session counts and volume change with every logged set.
    queryClient.invalidateQueries({ queryKey: sessionKeys.active }),
  ]);
}
