import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  clampSummaryDays,
  groupByMeal,
  parseDateOnly,
  shiftDate,
  sumMacros,
  toDateKey,
  type Macros,
  type Meal,
} from './nutrition-math.js';

const food = (calories: number, p: number, c: number, f: number): Macros => ({
  calories,
  proteinG: p,
  carbsG: c,
  fatG: f,
});

describe('parseDateOnly', () => {
  it('accepts a real calendar date', () => {
    assert.equal(toDateKey(parseDateOnly('2026-09-30')!), '2026-09-30');
  });

  it('accepts a leap day only in a leap year', () => {
    assert.ok(parseDateOnly('2028-02-29'));
    assert.equal(parseDateOnly('2027-02-29'), null);
  });

  it('rejects impossible dates instead of rolling them over', () => {
    assert.equal(parseDateOnly('2026-02-30'), null);
    assert.equal(parseDateOnly('2026-13-01'), null);
    assert.equal(parseDateOnly('2026-00-10'), null);
  });

  it('rejects malformed text and out-of-range years', () => {
    for (const value of [
      '',
      'bugün',
      '2026-9-30',
      '30-09-2026',
      '1999-12-31',
    ]) {
      assert.equal(parseDateOnly(value), null, value);
    }
    assert.equal(parseDateOnly('2101-01-01'), null);
  });
});

describe('shiftDate', () => {
  it('moves across month and year boundaries', () => {
    assert.equal(
      toDateKey(shiftDate(parseDateOnly('2026-03-01')!, 1)),
      '2026-02-28',
    );
    assert.equal(
      toDateKey(shiftDate(parseDateOnly('2026-01-01')!, 1)),
      '2025-12-31',
    );
    assert.equal(
      toDateKey(shiftDate(parseDateOnly('2026-09-30')!, -1)),
      '2026-10-01',
    );
  });
});

describe('clampSummaryDays', () => {
  it('defaults and clamps to the supported range', () => {
    assert.equal(clampSummaryDays(undefined), 14);
    assert.equal(clampSummaryDays(Number.NaN), 14);
    assert.equal(clampSummaryDays(1), 7);
    assert.equal(clampSummaryDays(500), 90);
    assert.equal(clampSummaryDays(30.9), 30);
  });
});

describe('sumMacros', () => {
  it('is zero for an empty list', () => {
    assert.deepEqual(sumMacros([]), food(0, 0, 0, 0));
  });

  it('adds calories and macros', () => {
    assert.deepEqual(
      sumMacros([food(250, 20, 30, 5), food(100, 5, 10, 2)]),
      food(350, 25, 40, 7),
    );
  });

  it('does not accumulate floating-point error', () => {
    const totals = sumMacros([food(0, 0.1, 0.1, 0.1), food(0, 0.2, 0.2, 0.2)]);
    assert.equal(totals.proteinG, 0.3);
    assert.equal(totals.carbsG, 0.3);
    assert.equal(totals.fatG, 0.3);
  });
});

describe('groupByMeal', () => {
  const entries: (Macros & { meal: Meal; name: string })[] = [
    { meal: 'dinner', name: 'Tavuk', ...food(300, 40, 0, 8) },
    { meal: 'breakfast', name: 'Yulaf', ...food(200, 7, 33, 4) },
    { meal: 'breakfast', name: 'Süt', ...food(100, 6, 9, 4) },
  ];

  it('always returns the four meals in order', () => {
    assert.deepEqual(
      groupByMeal(entries).map(({ meal }) => meal),
      ['breakfast', 'lunch', 'dinner', 'snack'],
    );
  });

  it('keeps empty meals and totals each meal separately', () => {
    const [breakfast, lunch, dinner] = groupByMeal(entries);
    assert.equal(breakfast.entries.length, 2);
    assert.equal(breakfast.totals.calories, 300);
    assert.equal(lunch.entries.length, 0);
    assert.equal(lunch.totals.calories, 0);
    assert.equal(dinner.totals.proteinG, 40);
  });
});
