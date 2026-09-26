import { describe, expect, it } from 'vitest';

import {
  formatCountdown,
  progressPercent,
  remainingSeconds,
} from './rest-timer';

describe('rest timer math', () => {
  it('derives remaining time from the deadline after a long background gap', () => {
    expect(remainingSeconds(90_000, 6_000)).toBe(84);
    expect(remainingSeconds(90_000, 89_001)).toBe(1);
    expect(remainingSeconds(90_000, 120_000)).toBe(0);
  });

  it('clamps progress at either end and formats the countdown', () => {
    expect(progressPercent(0, 90_000, -1)).toBe(0);
    expect(progressPercent(0, 90_000, 45_000)).toBe(50);
    expect(progressPercent(0, 90_000, 100_000)).toBe(100);
    expect(formatCountdown(84)).toBe('1:24');
  });

  it('incorporates a fifteen second extension in the deadline', () => {
    const endAt = 90_000 + 15_000;
    expect(remainingSeconds(endAt, 90_000)).toBe(15);
    expect(progressPercent(0, endAt, 90_000)).toBeCloseTo(85.71, 1);
  });
});
