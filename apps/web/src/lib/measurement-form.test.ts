import { afterEach, describe, expect, it } from 'vitest';

import { setWeightUnit } from './format';
import {
  emptyMeasurementDraft,
  latestMeasurementValues,
  toMeasurementInput,
  validateMeasurement,
} from './measurement-form';

afterEach(() => setWeightUnit('kg'));

const draft = (values: Partial<ReturnType<typeof emptyMeasurementDraft>>) => ({
  ...emptyMeasurementDraft('2026-09-27'),
  ...values,
});

describe('measurement validation', () => {
  it('requires at least one measurement', () => {
    expect(validateMeasurement(draft({})).form).toBeDefined();
    expect(validateMeasurement(draft({ waistCm: '82' }))).toEqual({});
  });

  it('accepts comma decimals and rejects out-of-range values', () => {
    expect(
      validateMeasurement(draft({ weight: '78,45', bodyFatPercent: '14,5' })),
    ).toEqual({});
    const errors = validateMeasurement(
      draft({ weight: '1000', bodyFatPercent: '100.5', armCm: '35.25' }),
    );
    expect(Object.keys(errors).sort()).toEqual([
      'armCm',
      'bodyFatPercent',
      'weight',
    ]);
  });
});

describe('measurement input', () => {
  it('sends kilograms, dot decimals, and null for blanks', () => {
    expect(
      toMeasurementInput(draft({ weight: '78,5', chestCm: '101,5' })),
    ).toEqual({
      measuredAt: '2026-09-27',
      weightKg: '78.5',
      bodyFatPercent: null,
      waistCm: null,
      chestCm: '101.5',
      armCm: null,
      note: null,
    });
  });

  it('converts body weight entered in pounds', () => {
    setWeightUnit('lb');
    expect(toMeasurementInput(draft({ weight: '176.37' })).weightKg).toBe('80');
  });
});

describe('latest measurement values', () => {
  it('takes each metric from the newest measurement that recorded it', () => {
    const base = {
      bodyFatPercent: null,
      waistCm: null,
      chestCm: null,
      armCm: null,
      note: null,
    };
    expect(
      latestMeasurementValues([
        {
          ...base,
          id: 'b',
          measuredAt: '2026-09-20',
          weightKg: null,
          waistCm: '81',
        },
        {
          ...base,
          id: 'a',
          measuredAt: '2026-09-01',
          weightKg: '79.5',
          waistCm: '83',
        },
      ]),
    ).toEqual({
      weightKg: '79.5',
      bodyFatPercent: null,
      waistCm: '81',
      chestCm: null,
      armCm: null,
    });
  });
});
