import { authorizedRequest } from '@/lib/api';
import type { WorkoutSession } from '@/types/session';

export const sessionKeys = {
  active: ['sessions', 'active'] as const,
};

export async function getActiveSession(): Promise<WorkoutSession | null> {
  const response = await authorizedRequest<{ session: WorkoutSession | null }>(
    '/sessions/active',
  );
  return response.session;
}

export function startSession(): Promise<WorkoutSession> {
  return authorizedRequest('/sessions', { method: 'POST' });
}

/** Returns null when the session had no logs and was removed. */
export async function finishSession(
  id: string,
  note: string,
): Promise<WorkoutSession | null> {
  const response = await authorizedRequest<{ session: WorkoutSession | null }>(
    `/sessions/${encodeURIComponent(id)}/finish`,
    { method: 'POST', body: JSON.stringify({ note }) },
  );
  return response.session;
}
