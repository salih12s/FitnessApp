import type { AuthStatus } from './auth-types';

/** Returns the destination for a protected route, or null while access is unresolved/allowed. */
/**
 * Where to go after signing in or registering: the app page that sent the
 * user to the auth screen (for example a coach invite link), else home.
 */
export function postAuthDestination(state: unknown): string {
  const from = (state as { from?: unknown } | null)?.from;
  return typeof from === 'string' && from.startsWith('/app') ? from : '/app';
}

export function protectedRouteRedirect(status: AuthStatus): '/login' | null {
  return status === 'unauthenticated' ? '/login' : null;
}
