import { afterEach, describe, expect, it } from 'vitest';

import {
  formatVolume,
  formatWeight,
  formatWeightChange,
  formatWeightWithUnit,
  setWeightUnit,
  toDisplayWeight,
  toKilograms,
  toWeightInput,
} from './format';

afterEach(() => setWeightUnit('kg'));

describe('weight formatting', () => {
  it('uses the Turkish decimal comma and drops trailing zeros', () => {
    expect(formatWeight('87.5')).toBe('87,5');
    expect(formatWeight('90.00')).toBe('90');
    expect(formatWeight('48.75')).toBe('48,75');
    expect(formatWeight(0)).toBe('0');
  });

  it('switches volume to tonnes above 1000 kg', () => {
    expect(formatVolume('850.5')).toEqual({ value: '851', unit: 'kg' });
    expect(formatVolume('10987.5')).toEqual({ value: '11', unit: 't' });
    expect(formatVolume(12_440)).toEqual({ value: '12,4', unit: 't' });
  });

  it('signs gains but not losses twice', () => {
    expect(formatWeightChange('20')).toBe('+20');
    expect(formatWeightChange('-2.5')).toBe('-2,5');
    expect(formatWeightChange('0')).toBe('0');
  });
});

describe('weight units', () => {
  it('converts kilograms to pounds for display, rounded to 2 decimals', () => {
    expect(toDisplayWeight('80', 'lb')).toBe(176.37);
    expect(toDisplayWeight('80', 'kg')).toBe(80);
  });

  it('converts entered pounds back to kilograms, rounded to 2 decimals', () => {
    expect(toKilograms('176.37', 'lb')).toBe('80');
    expect(toKilograms('45', 'lb')).toBe('20.41');
    expect(toKilograms('82,5', 'kg')).toBe('82.5');
  });

  it('keeps stored kilograms stable through a pound round trip', () => {
    for (const kilograms of ['20', '22.75', '60.5', '142.5', '0']) {
      const pounds = toDisplayWeight(kilograms, 'lb');
      expect(toKilograms(pounds, 'lb')).toBe(String(Number(kilograms)));
    }
  });

  it('formats every weight in the selected unit', () => {
    setWeightUnit('lb');
    expect(formatWeight('100')).toBe('220,46');
    expect(formatWeightWithUnit('100')).toBe('220,46 lb');
    expect(toWeightInput('100')).toBe('220.46');
    expect(formatVolume('1000')).toEqual({ value: '2,2', unit: 'bin lb' });
    expect(formatVolume('100')).toEqual({ value: '220', unit: 'lb' });
  });
});
