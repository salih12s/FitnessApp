import { describe, expect, it } from 'vitest';

import { validateWorkoutSet, validateWorkoutSets } from './workout-validation';

describe('workout entry validation', () => {
  it('accepts practical decimal weights and positive reps', () => {
    expect(validateWorkoutSet({ weight: '22.75', reps: '8' })).toEqual({});
  });

  it('rejects malformed, negative, and out-of-range values', () => {
    expect(validateWorkoutSet({ weight: '-1', reps: '0' })).toEqual({
      weight: expect.any(String),
      reps: expect.any(String),
    });
    expect(
      validateWorkoutSet({ weight: '10.123', reps: '8' }).weight,
    ).toBeTruthy();
  });

  it('returns errors for each invalid set without hiding valid sets', () => {
    expect(
      Object.keys(
        validateWorkoutSets([
          { id: 4, weight: '10', reps: '10' },
          { id: 7, weight: '', reps: '2' },
        ]),
      ),
    ).toEqual(['7']);
  });
});
