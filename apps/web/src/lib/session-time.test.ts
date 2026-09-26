import { describe, expect, it } from 'vitest';

import { formatDuration, formatElapsed } from './session-time';

describe('session time formatting', () => {
  it('shows a running clock with hours only when needed', () => {
    expect(formatElapsed(0)).toBe('0:00');
    expect(formatElapsed(245_000)).toBe('4:05');
    expect(formatElapsed(1_934_999)).toBe('32:14');
    expect(formatElapsed(3_909_000)).toBe('1:05:09');
    expect(formatElapsed(-5_000)).toBe('0:00');
  });

  it('rounds finished durations to minutes, at least one', () => {
    expect(formatDuration(10_000)).toBe('1 dk');
    expect(formatDuration(45 * 60_000)).toBe('45 dk');
    expect(formatDuration(60 * 60_000)).toBe('1 sa');
    expect(formatDuration(65 * 60_000 + 20_000)).toBe('1 sa 5 dk');
  });
});
