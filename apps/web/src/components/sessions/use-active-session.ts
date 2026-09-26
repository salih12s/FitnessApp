import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getActiveSession, sessionKeys, startSession } from '@/api/sessions';

export function useActiveSession() {
  return useQuery({
    queryKey: sessionKeys.active,
    queryFn: getActiveSession,
    retry: 1,
  });
}

export function useStartSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateId?: string) => startSession(templateId),
    onSuccess: async (session) => {
      queryClient.setQueryData(sessionKeys.active, session);
      // Templates show when they were last used.
      await queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}
