import { describe, expect, it } from 'vitest';

import {
  plannedSets,
  toTargetWeight,
  validateTemplateRow,
} from './template-form';

describe('template row validation', () => {
  it('accepts whole-number targets and an optional weight', () => {
    expect(
      validateTemplateRow({
        targetSets: '3',
        targetReps: '8',
        targetWeight: '',
      }),
    ).toEqual({});
    expect(
      validateTemplateRow({
        targetSets: '4',
        targetReps: '10',
        targetWeight: '82,5',
      }),
    ).toEqual({});
  });

  it('rejects out-of-range or malformed values', () => {
    const errors = validateTemplateRow({
      targetSets: '0',
      targetReps: '8.5',
      targetWeight: '-5',
    });

    expect(Object.keys(errors).sort()).toEqual([
      'targetReps',
      'targetSets',
      'targetWeight',
    ]);
  });

  it('builds entry sets from targets, falling back to the last top set', () => {
    expect(
      plannedSets({ targetSets: 2, targetReps: 8, targetWeightKg: '82.5' }),
    ).toEqual([
      { setNumber: 1, weightKg: '82.5', reps: 8 },
      { setNumber: 2, weightKg: '82.5', reps: 8 },
    ]);
    expect(
      plannedSets({ targetSets: 1, targetReps: 5, targetWeightKg: null }, [
        { weightKg: '80' },
        { weightKg: '90' },
      ]),
    ).toEqual([{ setNumber: 1, weightKg: '90', reps: 5 }]);
    expect(
      plannedSets({ targetSets: 1, targetReps: 5, targetWeightKg: null }),
    ).toEqual([{ setNumber: 1, weightKg: '', reps: 5 }]);
  });

  it('normalizes the decimal comma for the API', () => {
    expect(toTargetWeight(' 82,5 ')).toBe('82.5');
    expect(toTargetWeight('')).toBeNull();
  });
});
