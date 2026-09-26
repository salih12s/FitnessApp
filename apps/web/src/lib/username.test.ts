import { describe, expect, it } from 'vitest';

import { isValidUsername, normalizeUsername } from './username';

describe('username', () => {
  it('normalizes case and surrounding whitespace', () => {
    expect(normalizeUsername('  Salih.Fit  ')).toBe('salih.fit');
  });

  it('accepts 3-20 lowercase letters, digits, dots, and underscores', () => {
    expect(isValidUsername('sal')).toBe(true);
    expect(isValidUsername('salih_fit.2026')).toBe(true);
    expect(isValidUsername('ab')).toBe(false);
    expect(isValidUsername('a'.repeat(21))).toBe(false);
    expect(isValidUsername('şahin')).toBe(false);
    expect(isValidUsername('salih fit')).toBe(false);
  });
});
