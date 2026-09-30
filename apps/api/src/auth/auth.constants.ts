export const REFRESH_COOKIE_NAME = 'fitness_refresh';

const MINUTE_MS = 60_000;

/**
 * Per-IP request limits for the public auth endpoints. Shared networks (an
 * office, a school) send many visitors from one IP, so these leave room for
 * normal use while still stopping password guessing and demo flooding.
 */
export const AUTH_THROTTLE = {
  login: { limit: 10, ttl: MINUTE_MS },
  register: { limit: 5, ttl: 60 * MINUTE_MS },
  demo: { limit: 5, ttl: 10 * MINUTE_MS },
  // Every page load refreshes once, so this is generous.
  refresh: { limit: 30, ttl: MINUTE_MS },
} as const;
