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
    mutationFn: startSession,
    onSuccess: (session) => {
      queryClient.setQueryData(sessionKeys.active, session);
    },
  });
}
