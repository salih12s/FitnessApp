import { describe, expect, it } from 'vitest';

import { scopedApiPath, scopedAppPath } from './client-scope';

const clientId = '6f1c2a90-0000-4000-8000-000000000001';

describe('client scope paths', () => {
  it('keeps own paths unchanged', () => {
    expect(scopedApiPath('/history?page=1')).toBe('/history?page=1');
    expect(scopedAppPath('/app/exercises/squat', null)).toBe(
      '/app/exercises/squat',
    );
  });

  it('routes API requests to the client endpoints', () => {
    expect(scopedApiPath('/reports/overview?offset=180', clientId)).toBe(
      `/coach/clients/${clientId}/reports/overview?offset=180`,
    );
  });

  it('keeps app links inside the client workspace', () => {
    expect(scopedAppPath('/app/exercises/custom/row', clientId)).toBe(
      `/app/clients/${clientId}/exercises/custom/row`,
    );
    expect(scopedAppPath('/app', clientId)).toBe(`/app/clients/${clientId}`);
    expect(scopedAppPath('/login', clientId)).toBe('/login');
  });
});
