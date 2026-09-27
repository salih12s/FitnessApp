import { describe, expect, it } from 'vitest';

import { postAuthDestination, protectedRouteRedirect } from './route-access';

describe('protectedRouteRedirect', () => {
  it('redirects unauthenticated users to login', () => {
    expect(protectedRouteRedirect('unauthenticated')).toBe('/login');
  });

  it('keeps loading and authenticated routes in place', () => {
    expect(protectedRouteRedirect('loading')).toBeNull();
    expect(protectedRouteRedirect('authenticated')).toBeNull();
  });
});

describe('postAuthDestination', () => {
  it('returns to the app page that required sign-in', () => {
    expect(postAuthDestination({ from: '/app/join/ABCD2345' })).toBe(
      '/app/join/ABCD2345',
    );
  });

  it('ignores missing or foreign destinations', () => {
    expect(postAuthDestination(null)).toBe('/app');
    expect(postAuthDestination({ from: 'https://evil.example' })).toBe('/app');
  });
});
