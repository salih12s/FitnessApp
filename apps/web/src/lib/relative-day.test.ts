import { describe, expect, it } from 'vitest';

import { formatRelativeDay } from './relative-day';

const now = new Date(2026, 8, 27, 9, 30);

describe('relative day', () => {
  it('counts calendar days, not 24-hour periods', () => {
    expect(
      formatRelativeDay(new Date(2026, 8, 27, 0, 5).toISOString(), now),
    ).toBe('bugün');
    expect(
      formatRelativeDay(new Date(2026, 8, 26, 23, 50).toISOString(), now),
    ).toBe('dün');
    expect(
      formatRelativeDay(new Date(2026, 8, 22, 12).toISOString(), now),
    ).toBe('5 gün önce');
  });

  it('shows the date for older activity', () => {
    expect(formatRelativeDay(new Date(2026, 8, 4, 12).toISOString(), now)).toBe(
      '4 Eyl',
    );
  });
});
