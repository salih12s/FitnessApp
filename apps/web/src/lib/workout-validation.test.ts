import { describe, expect, it } from 'vitest';

import { validateWorkoutSet, validateWorkoutSets } from './workout-validation';

describe('workout entry validation', () => {
  it('accepts practical decimal weights and positive reps', () => {
    expect(validateWorkoutSet({ weightKg: '22.75', reps: '8' })).toEqual({});
  });

  it('rejects malformed, negative, and out-of-range values', () => {
    expect(validateWorkoutSet({ weightKg: '-1', reps: '0' })).toEqual({
      weightKg: expect.any(String),
      reps: expect.any(String),
    });
    expect(
      validateWorkoutSet({ weightKg: '10.123', reps: '8' }).weightKg,
    ).toBeTruthy();
  });

  it('returns errors for each invalid set without hiding valid sets', () => {
    expect(
      Object.keys(
        validateWorkoutSets([
          { id: 4, weightKg: '10', reps: '10' },
          { id: 7, weightKg: '', reps: '2' },
        ]),
      ),
    ).toEqual(['7']);
  });
});
