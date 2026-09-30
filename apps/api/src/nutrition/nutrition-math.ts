/** Pure helpers for the nutrition log: dates, totals, and grouping by meal. */

export const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export type Meal = (typeof MEALS)[number];

export const MAX_ENTRIES_PER_DAY = 200;
export const MAX_SAVED_FOODS = 200;
export const MIN_SUMMARY_DAYS = 7;
export const MAX_SUMMARY_DAYS = 90;
export const DEFAULT_SUMMARY_DAYS = 14;

const DAY_MS = 86_400_000;

export interface Macros {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/**
 * Parses a calendar date sent as `YYYY-MM-DD`. Impossible dates such as
 * `2026-02-30` (which `Date` would roll over to March) and years outside a
 * sensible range give `null`.
 */
export function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  if (date.toISOString().slice(0, 10) !== value) return null;
  const year = date.getUTCFullYear();
  return year >= 2000 && year <= 2100 ? date : null;
}

export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** The date `days` before `date` (or after, when negative). */
export function shiftDate(date: Date, days: number): Date {
  return new Date(date.getTime() - days * DAY_MS);
}

/** Keeps a requested trend length inside the supported range. */
export function clampSummaryDays(days: number | undefined): number {
  if (days === undefined || !Number.isFinite(days)) {
    return DEFAULT_SUMMARY_DAYS;
  }
  return Math.min(
    MAX_SUMMARY_DAYS,
    Math.max(MIN_SUMMARY_DAYS, Math.trunc(days)),
  );
}

const toTenths = (value: number): number => Math.round(value * 10);

/**
 * Adds up calories and macros. Macros are summed as whole tenths of a gram so
 * long lists do not accumulate floating-point error (0.1 + 0.2 stays 0.3).
 */
export function sumMacros(items: readonly Macros[]): Macros {
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;

  for (const item of items) {
    calories += item.calories;
    protein += toTenths(item.proteinG);
    carbs += toTenths(item.carbsG);
    fat += toTenths(item.fatG);
  }

  return {
    calories,
    proteinG: protein / 10,
    carbsG: carbs / 10,
    fatG: fat / 10,
  };
}

/** Entries split into the four meals, always in breakfast-to-snack order. */
export function groupByMeal<T extends Macros & { meal: Meal }>(
  entries: readonly T[],
): { meal: Meal; totals: Macros; entries: T[] }[] {
  return MEALS.map((meal) => {
    const mealEntries = entries.filter((entry) => entry.meal === meal);
    return { meal, totals: sumMacros(mealEntries), entries: mealEntries };
  });
}
