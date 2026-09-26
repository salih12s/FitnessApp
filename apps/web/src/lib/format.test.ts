import { describe, expect, it } from 'vitest';

import { formatVolume, formatWeight, formatWeightChange } from './format';

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
