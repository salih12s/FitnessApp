export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Macros {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface FoodEntry extends Macros {
  id: string;
  /** Calendar day, `YYYY-MM-DD`. */
  eatenOn: string;
  meal: Meal;
  name: string;
  servingLabel: string | null;
  note: string | null;
}

export interface NutritionGoal {
  calories: number;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
}

export interface MealGroup {
  meal: Meal;
  totals: Macros;
  entries: FoodEntry[];
}

export interface NutritionDay {
  date: string;
  goal: NutritionGoal | null;
  totals: Macros;
  meals: MealGroup[];
}

export interface NutritionSummaryDay extends Macros {
  date: string;
  entryCount: number;
}

export interface NutritionSummary {
  goal: NutritionGoal | null;
  from: string;
  to: string;
  days: NutritionSummaryDay[];
}

/** A food the user can add again: a favorite or a recently logged one. */
export interface KnownFood extends Macros {
  name: string;
  servingLabel: string | null;
}

export interface SavedFood extends KnownFood {
  id: string;
}

export interface FoodLibrary {
  saved: SavedFood[];
  recent: KnownFood[];
}

/** The body of a create request. */
export interface FoodEntryInput extends Macros {
  eatenOn: string;
  meal: Meal;
  name: string;
  servingLabel?: string;
  note?: string;
  saveAsFavorite?: boolean;
}

export interface GoalInput {
  calories: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
}

/** A partial update; `null` clears the serving label or the note. */
export type FoodEntryUpdate = Partial<
  Omit<FoodEntryInput, 'servingLabel' | 'note' | 'saveAsFavorite'>
> & { servingLabel?: string | null; note?: string | null };

/** A food from the built-in catalog or Open Food Facts; values are for 100 g. */
export interface CatalogFood {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  source: 'catalog' | 'openfoodfacts';
  per100g: Macros;
  servingLabel: string;
  servingGrams: number;
}

export type Confidence = 'high' | 'medium' | 'low';

/** One food the model found in a meal photo, with an estimate for the portion. */
export interface DetectedFood extends Macros {
  name: string;
  servingLabel: string;
  grams: number;
  confidence: Confidence;
}

export interface PhotoAnalysis {
  items: DetectedFood[];
  note: string | null;
}

export interface NutritionFeatures {
  photoAnalysis: boolean;
}

export interface BatchFoodItem extends Macros {
  name: string;
  servingLabel?: string;
}
