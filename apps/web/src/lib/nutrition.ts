import type {
  BatchFoodItem,
  CatalogFood,
  DetectedFood,
  FoodEntry,
  FoodEntryInput,
  FoodEntryUpdate,
  GoalInput,
  KnownFood,
  Macros,
  Meal,
  NutritionGoal,
  NutritionSummaryDay,
} from '@/types/nutrition';

export const meals: readonly Meal[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export const mealLabels: Record<Meal, string> = {
  breakfast: 'Kahvaltı',
  lunch: 'Öğle yemeği',
  dinner: 'Akşam yemeği',
  snack: 'Ara öğün',
};

const DAY_MS = 86_400_000;

// --- Dates -----------------------------------------------------------------

export function isDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

/** The calendar day `delta` days after `key` (before when negative). */
export function addDays(key: string, delta: number): string {
  const date = new Date(`${key}T00:00:00.000Z`);
  return new Date(date.getTime() + delta * DAY_MS).toISOString().slice(0, 10);
}

const weekdayFormatter = new Intl.DateTimeFormat('tr-TR', {
  weekday: 'long',
  timeZone: 'UTC',
});
const fullDateFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const shortDateFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

/** "Bugün", "Dün", "Yarın" or the weekday, plus the full date. */
export function formatDayLabel(
  key: string,
  todayKey: string,
): { title: string; subtitle: string } {
  const date = new Date(`${key}T00:00:00.000Z`);
  let title: string;
  if (key === todayKey) title = 'Bugün';
  else if (key === addDays(todayKey, -1)) title = 'Dün';
  else if (key === addDays(todayKey, 1)) title = 'Yarın';
  else {
    const weekday = weekdayFormatter.format(date);
    title = weekday.charAt(0).toLocaleUpperCase('tr-TR') + weekday.slice(1);
  }
  return { title, subtitle: fullDateFormatter.format(date) };
}

export function formatShortDate(key: string): string {
  return shortDateFormatter.format(new Date(`${key}T00:00:00.000Z`));
}

// --- Numbers ---------------------------------------------------------------

/** Parses "12,5" or "12.5"; `null` for anything that is not a plain number. */
export function parseAmount(text: string): number | null {
  const value = text.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(value)) return null;
  return Number(value);
}

/** Calories from macros: 4 kcal per gram of protein and carbs, 9 of fat. */
export function macroCalories(
  proteinG: number,
  carbsG: number,
  fatG: number,
): number {
  return Math.round(proteinG * 4 + carbsG * 4 + fatG * 9);
}

const oneDecimal = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 });
const wholeNumber = new Intl.NumberFormat('tr-TR', {
  maximumFractionDigits: 0,
});

export function formatCalories(value: number): string {
  return wholeNumber.format(value);
}

export function formatGrams(value: number): string {
  return oneDecimal.format(value);
}

// --- Progress --------------------------------------------------------------

export interface CalorieProgress {
  /** Share of the goal eaten, capped to 0-1 so a ring never overflows. */
  ratio: number;
  /** Calories left today; negative once the goal is passed. */
  remaining: number;
  isOver: boolean;
}

export function calorieProgress(
  consumed: number,
  goalCalories: number | null | undefined,
): CalorieProgress | null {
  if (!goalCalories || goalCalories <= 0) return null;
  return {
    ratio: Math.min(1, Math.max(0, consumed / goalCalories)),
    remaining: goalCalories - consumed,
    isOver: consumed > goalCalories,
  };
}

/** Share of a macro target reached, capped to 0-1; `null` without a target. */
export function macroRatio(
  consumed: number,
  target: number | null | undefined,
): number | null {
  if (!target || target <= 0) return null;
  return Math.min(1, Math.max(0, consumed / target));
}

/** Where a day's macro calories come from, as whole percents that add to 100. */
export function macroShares(
  totals: Pick<Macros, 'proteinG' | 'carbsG' | 'fatG'>,
): { protein: number; carbs: number; fat: number } | null {
  const protein = totals.proteinG * 4;
  const carbs = totals.carbsG * 4;
  const fat = totals.fatG * 9;
  const sum = protein + carbs + fat;
  if (sum <= 0) return null;

  const proteinPercent = Math.round((protein / sum) * 100);
  const carbsPercent = Math.round((carbs / sum) * 100);
  return {
    protein: proteinPercent,
    carbs: carbsPercent,
    fat: 100 - proteinPercent - carbsPercent,
  };
}

// --- Food form -------------------------------------------------------------

export interface FoodDraft {
  name: string;
  servingLabel: string;
  calories: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
  note: string;
  saveAsFavorite: boolean;
}

export type FoodErrors = Partial<Record<keyof FoodDraft | 'form', string>>;

export function emptyFoodDraft(): FoodDraft {
  return {
    name: '',
    servingLabel: '',
    calories: '',
    proteinG: '',
    carbsG: '',
    fatG: '',
    note: '',
    saveAsFavorite: false,
  };
}

const text = (value: number): string => (value === 0 ? '' : String(value));

export function draftFromFood(food: KnownFood): FoodDraft {
  return {
    ...emptyFoodDraft(),
    name: food.name,
    servingLabel: food.servingLabel ?? '',
    calories: String(food.calories),
    proteinG: text(food.proteinG),
    carbsG: text(food.carbsG),
    fatG: text(food.fatG),
  };
}

export function draftFromEntry(entry: FoodEntry): FoodDraft {
  return { ...draftFromFood(entry), note: entry.note ?? '' };
}

const macroFields = ['proteinG', 'carbsG', 'fatG'] as const;
const macroLabels = {
  proteinG: 'Protein',
  carbsG: 'Karbonhidrat',
  fatG: 'Yağ',
} as const;

export function validateFoodDraft(draft: FoodDraft): FoodErrors {
  const errors: FoodErrors = {};
  const name = draft.name.trim();

  if (!name) errors.name = 'Yiyeceğin adını yaz.';
  else if (name.length > 120)
    errors.name = 'Ad en fazla 120 karakter olabilir.';
  if (draft.servingLabel.trim().length > 60) {
    errors.servingLabel = 'Porsiyon en fazla 60 karakter olabilir.';
  }
  if (draft.note.length > 500) {
    errors.note = 'Not en fazla 500 karakter olabilir.';
  }

  for (const field of macroFields) {
    const value = draft[field].trim();
    if (!value) continue;
    if (!/^\d{1,3}([.,]\d)?$/.test(value)) {
      errors[field] =
        `${macroLabels[field]} için 0 ile 999,9 arasında, en fazla bir ondalık gir.`;
    }
  }

  const calories = draft.calories.trim();
  const hasMacros = macroFields.some((field) => draft[field].trim());
  if (calories) {
    if (!/^\d{1,5}$/.test(calories) || Number(calories) > 10_000) {
      errors.calories = '0 ile 10.000 arasında tam bir sayı gir.';
    }
  } else if (!hasMacros) {
    errors.calories = 'Kaloriyi ya da en az bir makro değerini gir.';
  }

  return errors;
}

function macrosOf(
  draft: FoodDraft,
): Pick<Macros, 'proteinG' | 'carbsG' | 'fatG'> {
  return {
    proteinG: parseAmount(draft.proteinG) ?? 0,
    carbsG: parseAmount(draft.carbsG) ?? 0,
    fatG: parseAmount(draft.fatG) ?? 0,
  };
}

/** The calories the form will save: typed, or worked out from the macros. */
export function draftCalories(draft: FoodDraft): number {
  const typed = draft.calories.trim();
  if (typed) return Number(typed);
  const { proteinG, carbsG, fatG } = macrosOf(draft);
  return macroCalories(proteinG, carbsG, fatG);
}

/** True when the calories will come from the macros rather than the field. */
export function isCaloriesDerived(draft: FoodDraft): boolean {
  return (
    !draft.calories.trim() && macroFields.some((field) => draft[field].trim())
  );
}

export function toFoodInput(
  draft: FoodDraft,
  eatenOn: string,
  meal: Meal,
): FoodEntryInput {
  const servingLabel = draft.servingLabel.trim();
  const note = draft.note.trim();

  return {
    eatenOn,
    meal,
    name: draft.name.trim(),
    calories: draftCalories(draft),
    ...macrosOf(draft),
    ...(servingLabel ? { servingLabel } : {}),
    ...(note ? { note } : {}),
    ...(draft.saveAsFavorite ? { saveAsFavorite: true } : {}),
  };
}

/** Like `toFoodInput`, but clears an emptied label or note instead of omitting it. */
export function toFoodUpdate(draft: FoodDraft): FoodEntryUpdate {
  return {
    name: draft.name.trim(),
    calories: draftCalories(draft),
    ...macrosOf(draft),
    servingLabel: draft.servingLabel.trim() || null,
    note: draft.note.trim() || null,
  };
}

// --- Goal form -------------------------------------------------------------

export interface GoalDraft {
  calories: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
}

export type GoalErrors = Partial<Record<keyof GoalDraft, string>>;

export function goalDraftFrom(goal: NutritionGoal | null): GoalDraft {
  return {
    calories: goal ? String(goal.calories) : '',
    proteinG: goal?.proteinG != null ? String(goal.proteinG) : '',
    carbsG: goal?.carbsG != null ? String(goal.carbsG) : '',
    fatG: goal?.fatG != null ? String(goal.fatG) : '',
  };
}

const goalLimits = { proteinG: 1000, carbsG: 1500, fatG: 1000 } as const;

export function validateGoalDraft(draft: GoalDraft): GoalErrors {
  const errors: GoalErrors = {};
  const calories = draft.calories.trim();

  if (
    !/^\d{3,5}$/.test(calories) ||
    Number(calories) < 500 ||
    Number(calories) > 10_000
  ) {
    errors.calories = '500 ile 10.000 arasında tam bir sayı gir.';
  }
  for (const field of macroFields) {
    const value = draft[field].trim();
    if (
      value &&
      (!/^\d{1,4}$/.test(value) || Number(value) > goalLimits[field])
    ) {
      errors[field] = `0 ile ${goalLimits[field]} arasında tam bir sayı gir.`;
    }
  }
  return errors;
}

export function toGoalInput(draft: GoalDraft): GoalInput {
  const input: GoalInput = { calories: Number(draft.calories.trim()) };
  for (const field of macroFields) {
    const value = draft[field].trim();
    if (value) input[field] = Number(value);
  }
  return input;
}

// --- Trend -----------------------------------------------------------------

export interface TrendDay {
  date: string;
  calories: number;
  hasEntries: boolean;
}

/** One bar per day ending at `to`; days without entries are zero. */
export function trendDays(
  logged: readonly NutritionSummaryDay[],
  to: string,
  length: number,
): TrendDay[] {
  const byDate = new Map(logged.map((day) => [day.date, day]));
  return Array.from({ length }, (_, index) => {
    const date = addDays(to, index - (length - 1));
    const day = byDate.get(date);
    return {
      date,
      calories: day?.calories ?? 0,
      hasEntries: Boolean(day && day.entryCount > 0),
    };
  });
}

/**
 * Average calories over days that have entries. Today is left out because it
 * is still in progress and would pull the average down.
 */
export function averageCalories(
  days: readonly TrendDay[],
  todayKey: string,
): number | null {
  const complete = days.filter(
    (day) => day.hasEntries && day.date !== todayKey,
  );
  if (complete.length === 0) return null;
  const sum = complete.reduce((total, day) => total + day.calories, 0);
  return Math.round(sum / complete.length);
}

// --- Food database and photo ------------------------------------------------

/** Calories and macros for `grams` of a food given per 100 g. */
export function scaleToGrams(per100g: Macros, grams: number): Macros {
  const factor = grams / 100;
  return {
    calories: Math.round(per100g.calories * factor),
    proteinG: Math.round(per100g.proteinG * factor * 10) / 10,
    carbsG: Math.round(per100g.carbsG * factor * 10) / 10,
    fatG: Math.round(per100g.fatG * factor * 10) / 10,
  };
}

/** A gram amount typed as "150" or "150,5"; `null` unless it is between 1 and 5000. */
export function parseGrams(text: string): number | null {
  const value = parseAmount(text);
  return value !== null && value >= 1 && value <= 5000 ? value : null;
}

/** The entry form filled from a database food and the amount the user chose. */
export function draftFromCatalogFood(
  food: CatalogFood,
  grams: number,
): FoodDraft {
  const scaled = scaleToGrams(food.per100g, grams);
  const rounded = Math.round(grams * 10) / 10;
  return {
    ...emptyFoodDraft(),
    name: food.brand ? `${food.name} (${food.brand})`.slice(0, 120) : food.name,
    servingLabel: `${formatGrams(rounded)} g`,
    calories: String(scaled.calories),
    proteinG: text(scaled.proteinG),
    carbsG: text(scaled.carbsG),
    fatG: text(scaled.fatG),
  };
}

/** What a photo found, in the shape the batch endpoint takes. */
export function detectedToBatchItem(item: DetectedFood): BatchFoodItem {
  return {
    name: item.name,
    servingLabel: item.servingLabel,
    calories: item.calories,
    proteinG: item.proteinG,
    carbsG: item.carbsG,
    fatG: item.fatG,
  };
}

/** Size that fits inside `max` on the longer side, keeping the proportions. */
export function fitWithin(
  width: number,
  height: number,
  max: number,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= max) return { width, height };
  const scale = max / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export const confidenceLabels: Record<DetectedFood['confidence'], string> = {
  high: 'Yüksek güven',
  medium: 'Orta güven',
  low: 'Düşük güven',
};
