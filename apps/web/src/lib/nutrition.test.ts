import { describe, expect, it } from 'vitest';

import {
  addDays,
  averageCalories,
  calorieProgress,
  detectedToBatchItem,
  draftCalories,
  draftFromCatalogFood,
  draftFromEntry,
  emptyFoodDraft,
  fitWithin,
  formatDayLabel,
  goalDraftFrom,
  isCaloriesDerived,
  isDateKey,
  macroCalories,
  macroRatio,
  macroShares,
  parseAmount,
  parseGrams,
  scaleToGrams,
  toFoodInput,
  toFoodUpdate,
  toGoalInput,
  trendDays,
  validateFoodDraft,
  validateGoalDraft,
  type FoodDraft,
} from './nutrition';

const draft = (overrides: Partial<FoodDraft> = {}): FoodDraft => ({
  ...emptyFoodDraft(),
  name: 'Yulaf',
  calories: '190',
  ...overrides,
});

describe('dates', () => {
  it('moves across month and year boundaries', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-09-30', 0)).toBe('2026-09-30');
  });

  it('validates calendar dates', () => {
    expect(isDateKey('2026-09-30')).toBe(true);
    expect(isDateKey('2026-02-30')).toBe(false);
    expect(isDateKey('bugün')).toBe(false);
  });

  it('names today, yesterday and tomorrow, and the weekday otherwise', () => {
    const today = '2026-09-30';
    expect(formatDayLabel('2026-09-30', today).title).toBe('Bugün');
    expect(formatDayLabel('2026-09-29', today).title).toBe('Dün');
    expect(formatDayLabel('2026-10-01', today).title).toBe('Yarın');
    expect(formatDayLabel('2026-09-25', today).title).toBe('Cuma');
    expect(formatDayLabel('2026-09-25', today).subtitle).toBe('25 Eylül 2026');
  });
});

describe('numbers', () => {
  it('parses Turkish and English decimals', () => {
    expect(parseAmount('12,5')).toBe(12.5);
    expect(parseAmount(' 12.5 ')).toBe(12.5);
    expect(parseAmount('0')).toBe(0);
  });

  it('rejects text, negatives and empty input', () => {
    for (const value of ['', 'abc', '-3', '1,2,3', '12g']) {
      expect(parseAmount(value)).toBeNull();
    }
  });

  it('works out calories from macros (4, 4 and 9 kcal per gram)', () => {
    expect(macroCalories(30, 50, 10)).toBe(410);
    expect(macroCalories(0, 0, 0)).toBe(0);
    expect(macroCalories(6.5, 33, 3.5)).toBe(190);
  });
});

describe('progress', () => {
  it('has no progress without a goal', () => {
    expect(calorieProgress(500, null)).toBeNull();
    expect(calorieProgress(500, 0)).toBeNull();
  });

  it('reports what is left and caps the ring at full', () => {
    expect(calorieProgress(600, 2400)).toEqual({
      ratio: 0.25,
      remaining: 1800,
      isOver: false,
    });
    expect(calorieProgress(2400, 2400)).toEqual({
      ratio: 1,
      remaining: 0,
      isOver: false,
    });
    expect(calorieProgress(2700, 2400)).toEqual({
      ratio: 1,
      remaining: -300,
      isOver: true,
    });
  });

  it('measures a macro against its target, if there is one', () => {
    expect(macroRatio(80, 160)).toBe(0.5);
    expect(macroRatio(200, 160)).toBe(1);
    expect(macroRatio(80, null)).toBeNull();
  });

  it('splits macro calories into percents that always add to 100', () => {
    expect(macroShares({ proteinG: 0, carbsG: 0, fatG: 0 })).toBeNull();
    const shares = macroShares({ proteinG: 100, carbsG: 100, fatG: 100 });
    expect(shares).not.toBeNull();
    expect(shares!.protein + shares!.carbs + shares!.fat).toBe(100);
    expect(macroShares({ proteinG: 25, carbsG: 0, fatG: 0 })).toEqual({
      protein: 100,
      carbs: 0,
      fat: 0,
    });
  });
});

describe('food form validation', () => {
  it('accepts a complete food', () => {
    expect(validateFoodDraft(draft())).toEqual({});
  });

  it('needs a name', () => {
    expect(validateFoodDraft(draft({ name: '   ' })).name).toBeDefined();
    expect(
      validateFoodDraft(draft({ name: 'x'.repeat(121) })).name,
    ).toBeDefined();
  });

  it('needs calories or a macro', () => {
    expect(validateFoodDraft(draft({ calories: '' })).calories).toBeDefined();
    expect(validateFoodDraft(draft({ calories: '', proteinG: '20' }))).toEqual(
      {},
    );
  });

  it('bounds calories to whole numbers up to 10.000', () => {
    for (const calories of ['-5', '12,5', 'abc', '10001', '123456']) {
      expect(validateFoodDraft(draft({ calories })).calories).toBeDefined();
    }
    expect(validateFoodDraft(draft({ calories: '10000' }))).toEqual({});
    expect(validateFoodDraft(draft({ calories: '0' }))).toEqual({});
  });

  it('allows one decimal for macros and rejects more', () => {
    expect(validateFoodDraft(draft({ proteinG: '12,5' }))).toEqual({});
    expect(
      validateFoodDraft(draft({ proteinG: '12.55' })).proteinG,
    ).toBeDefined();
    expect(validateFoodDraft(draft({ carbsG: '1000' })).carbsG).toBeDefined();
    expect(validateFoodDraft(draft({ fatG: '-1' })).fatG).toBeDefined();
  });

  it('limits the serving label and the note', () => {
    expect(
      validateFoodDraft(draft({ servingLabel: 'x'.repeat(61) })).servingLabel,
    ).toBeDefined();
    expect(
      validateFoodDraft(draft({ note: 'x'.repeat(501) })).note,
    ).toBeDefined();
  });
});

describe('food form payloads', () => {
  it('uses the typed calories', () => {
    expect(draftCalories(draft({ proteinG: '50' }))).toBe(190);
    expect(isCaloriesDerived(draft({ proteinG: '50' }))).toBe(false);
  });

  it('derives calories from macros when the field is empty', () => {
    const empty = draft({
      calories: '',
      proteinG: '30',
      carbsG: '50,5',
      fatG: '10',
    });
    expect(isCaloriesDerived(empty)).toBe(true);
    expect(draftCalories(empty)).toBe(412);
  });

  it('builds a create request with only the fields that were filled in', () => {
    expect(toFoodInput(draft(), '2026-09-30', 'breakfast')).toEqual({
      eatenOn: '2026-09-30',
      meal: 'breakfast',
      name: 'Yulaf',
      calories: 190,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
    });
    expect(
      toFoodInput(
        draft({
          name: '  Tavuk  ',
          servingLabel: ' 150 g ',
          proteinG: '46,1',
          note: ' akşam ',
          saveAsFavorite: true,
        }),
        '2026-09-30',
        'dinner',
      ),
    ).toEqual({
      eatenOn: '2026-09-30',
      meal: 'dinner',
      name: 'Tavuk',
      calories: 190,
      proteinG: 46.1,
      carbsG: 0,
      fatG: 0,
      servingLabel: '150 g',
      note: 'akşam',
      saveAsFavorite: true,
    });
  });

  it('clears an emptied label and note on update', () => {
    const update = toFoodUpdate(draft({ servingLabel: '  ', note: '' }));
    expect(update.servingLabel).toBeNull();
    expect(update.note).toBeNull();
  });

  it('round-trips an entry through the form', () => {
    const restored = draftFromEntry({
      id: '1',
      eatenOn: '2026-09-30',
      meal: 'lunch',
      name: 'Pilav',
      servingLabel: '150 g',
      calories: 195,
      proteinG: 4,
      carbsG: 42,
      fatG: 0,
      note: null,
    });
    expect(restored).toMatchObject({
      name: 'Pilav',
      servingLabel: '150 g',
      calories: '195',
      proteinG: '4',
      carbsG: '42',
      fatG: '',
      note: '',
    });
  });
});

describe('goal form', () => {
  it('starts empty without a goal and fills from an existing one', () => {
    expect(goalDraftFrom(null).calories).toBe('');
    expect(
      goalDraftFrom({
        calories: 2400,
        proteinG: 160,
        carbsG: null,
        fatG: null,
      }),
    ).toEqual({ calories: '2400', proteinG: '160', carbsG: '', fatG: '' });
  });

  it('requires 500 to 10.000 calories and whole-number macros', () => {
    const ok = { calories: '2400', proteinG: '', carbsG: '', fatG: '' };
    expect(validateGoalDraft(ok)).toEqual({});
    expect(
      validateGoalDraft({ ...ok, calories: '499' }).calories,
    ).toBeDefined();
    expect(
      validateGoalDraft({ ...ok, calories: '10001' }).calories,
    ).toBeDefined();
    expect(validateGoalDraft({ ...ok, calories: '' }).calories).toBeDefined();
    expect(
      validateGoalDraft({ ...ok, proteinG: '12,5' }).proteinG,
    ).toBeDefined();
    expect(validateGoalDraft({ ...ok, fatG: '1001' }).fatG).toBeDefined();
  });

  it('sends only the targets that were set', () => {
    expect(
      toGoalInput({ calories: '2400', proteinG: '160', carbsG: '', fatG: '' }),
    ).toEqual({ calories: 2400, proteinG: 160 });
  });
});

describe('trend', () => {
  const logged = [
    {
      date: '2026-09-28',
      calories: 2000,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
      entryCount: 4,
    },
    {
      date: '2026-09-30',
      calories: 900,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
      entryCount: 2,
    },
  ];

  it('gives one bar per day ending at the last day, filling gaps with zero', () => {
    const days = trendDays(logged, '2026-09-30', 4);
    expect(days.map((day) => day.date)).toEqual([
      '2026-09-27',
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
    ]);
    expect(days.map((day) => day.calories)).toEqual([0, 2000, 0, 900]);
    expect(days.map((day) => day.hasEntries)).toEqual([
      false,
      true,
      false,
      true,
    ]);
  });

  it('averages complete days only, leaving out today and empty days', () => {
    const days = trendDays(logged, '2026-09-30', 4);
    expect(averageCalories(days, '2026-09-30')).toBe(2000);
  });

  it('has no average when there is nothing to average', () => {
    expect(
      averageCalories(trendDays([], '2026-09-30', 7), '2026-09-30'),
    ).toBeNull();
    expect(
      averageCalories(
        trendDays(logged.slice(1), '2026-09-30', 7),
        '2026-09-30',
      ),
    ).toBeNull();
  });
});

describe('food database', () => {
  const chicken = {
    id: 'usda-1',
    name: 'Tavuk göğsü (pişmiş)',
    brand: null,
    category: 'Et ve tavuk',
    source: 'catalog' as const,
    per100g: { calories: 165, proteinG: 31, carbsG: 0, fatG: 3.6 },
    servingLabel: '1 porsiyon (120 g)',
    servingGrams: 120,
  };

  it('scales per-100 g values to the amount eaten', () => {
    expect(scaleToGrams(chicken.per100g, 100)).toEqual(chicken.per100g);
    expect(scaleToGrams(chicken.per100g, 150)).toEqual({
      calories: 248,
      proteinG: 46.5,
      carbsG: 0,
      fatG: 5.4,
    });
    expect(scaleToGrams(chicken.per100g, 50).calories).toBe(83);
  });

  it('reads gram amounts, with either decimal mark', () => {
    expect(parseGrams('150')).toBe(150);
    expect(parseGrams('12,5')).toBe(12.5);
    for (const value of ['', '0', '0,5', 'abc', '-20', '5001', '1e3']) {
      expect(parseGrams(value)).toBeNull();
    }
  });

  it('fills the entry form from a database food', () => {
    expect(draftFromCatalogFood(chicken, 150)).toMatchObject({
      name: 'Tavuk göğsü (pişmiş)',
      servingLabel: '150 g',
      calories: '248',
      proteinG: '46.5',
      carbsG: '',
      fatG: '5.4',
    });
    expect(validateFoodDraft(draftFromCatalogFood(chicken, 150))).toEqual({});
  });

  it('adds the brand of a packaged product to its name', () => {
    const draft = draftFromCatalogFood(
      { ...chicken, name: 'Yumurta', brand: 'Anadolu Çiftliği' },
      100,
    );
    expect(draft.name).toBe('Yumurta (Anadolu Çiftliği)');
  });

  it('keeps a very long packaged name within the form limit', () => {
    const draft = draftFromCatalogFood(
      { ...chicken, name: 'a'.repeat(120), brand: 'b'.repeat(60) },
      100,
    );
    expect(draft.name.length).toBe(120);
    expect(validateFoodDraft(draft)).toEqual({});
  });
});

describe('meal photo', () => {
  it('turns a detected food into a batch item without the extra fields', () => {
    expect(
      detectedToBatchItem({
        name: 'Pilav',
        servingLabel: '~150 g',
        grams: 150,
        calories: 195,
        proteinG: 4,
        carbsG: 42,
        fatG: 0.5,
        confidence: 'medium',
      }),
    ).toEqual({
      name: 'Pilav',
      servingLabel: '~150 g',
      calories: 195,
      proteinG: 4,
      carbsG: 42,
      fatG: 0.5,
    });
  });

  it('shrinks a photo to fit, keeping its proportions', () => {
    expect(fitWithin(4000, 3000, 1280)).toEqual({ width: 1280, height: 960 });
    expect(fitWithin(3000, 4000, 1280)).toEqual({ width: 960, height: 1280 });
  });

  it('never enlarges a small photo', () => {
    expect(fitWithin(800, 600, 1280)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(1280, 1280, 1280)).toEqual({ width: 1280, height: 1280 });
  });

  it('never rounds a thin photo down to nothing', () => {
    expect(fitWithin(10000, 1, 1280).height).toBe(1);
  });
});
