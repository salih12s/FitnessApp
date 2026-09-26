import { describe, expect, it } from 'vitest';

import {
  bestOneRepMax,
  estimateOneRepMax,
  heatOpacity,
  setVolume,
} from './strength';

describe('strength metrics', () => {
  it('estimates the one-rep max with the Epley formula', () => {
    expect(estimateOneRepMax(100, 1)).toBe(100);
    expect(estimateOneRepMax(100, 10)).toBeCloseTo(133.33, 2);
    expect(estimateOneRepMax(80, 8)).toBeCloseTo(101.33, 2);
  });

  it('picks the best set and rounds to one decimal', () => {
    expect(
      bestOneRepMax([
        { weightKg: '87.5', reps: 8 },
        { weightKg: '90', reps: 6 },
      ]),
    ).toBe(110.8);
    expect(bestOneRepMax([])).toBe(0);
  });

  it('sums weight times reps', () => {
    expect(
      setVolume([
        { weightKg: '80', reps: 8 },
        { weightKg: '82.5', reps: 6 },
      ]),
    ).toBe(1135);
  });

  it('scales heat from a visible minimum and leaves idle muscles blank', () => {
    expect(heatOpacity(0, 5000)).toBe(0);
    expect(heatOpacity(5000, 5000)).toBe(1);
    expect(heatOpacity(2500, 5000)).toBeCloseTo(0.625);
    expect(heatOpacity(100, 0)).toBe(0);
  });
});
