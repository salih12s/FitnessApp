import type { AuthStatus } from './auth-types';

/** Returns the destination for a protected route, or null while access is unresolved/allowed. */
export function protectedRouteRedirect(status: AuthStatus): '/login' | null {
  return status === 'unauthenticated' ? '/login' : null;
}
