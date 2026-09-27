import { QueryClient } from '@tanstack/react-query';

/** Shared defaults for the app cache and each coach's per-client cache. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        staleTime: 5 * 60 * 1000,
      },
    },
  });
}
