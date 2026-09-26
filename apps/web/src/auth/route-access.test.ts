import { describe, expect, it } from 'vitest';

import { protectedRouteRedirect } from './route-access';

describe('protectedRouteRedirect', () => {
  it('redirects unauthenticated users to login', () => {
    expect(protectedRouteRedirect('unauthenticated')).toBe('/login');
  });

  it('keeps loading and authenticated routes in place', () => {
    expect(protectedRouteRedirect('loading')).toBeNull();
    expect(protectedRouteRedirect('authenticated')).toBeNull();
  });
});
