import {
  levenshtein,
  normalizeSearchText,
} from '../exercises/exercise-search.js';
import { FOOD_CATALOG_DATA } from './food-catalog.data.js';

/** One food in the built-in catalog; values are per 100 g. */
export interface CatalogFoodRecord {
  id: string;
  name: string;
  category: string;
  /** Extra words (Turkish and English) that should also find the food. */
  aliases: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  servingLabel: string;
  servingGrams: number;
}

/** A search result, from the built-in catalog or Open Food Facts. */
export interface CatalogFood {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  source: 'catalog' | 'openfoodfacts';
  /** Values for 100 g of the food. */
  per100g: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  };
  servingLabel: string;
  servingGrams: number;
}

export const CATALOG_RESULT_LIMIT = 25;

interface Indexed {
  record: CatalogFoodRecord;
  nameText: string;
  aliasText: string;
  nameWords: string[];
}

const index: readonly Indexed[] = FOOD_CATALOG_DATA.map((record) => {
  const nameText = normalizeSearchText(record.name);
  return {
    record,
    nameText: ` ${nameText} `,
    aliasText: ` ${normalizeSearchText(record.aliases)} `,
    nameWords: nameText.split(' ').filter(Boolean),
  };
});

export function toCatalogFood(record: CatalogFoodRecord): CatalogFood {
  return {
    id: record.id,
    name: record.name,
    brand: null,
    category: record.category,
    source: 'catalog',
    per100g: {
      calories: record.calories,
      proteinG: record.proteinG,
      carbsG: record.carbsG,
      fatG: record.fatG,
    },
    servingLabel: record.servingLabel,
    servingGrams: record.servingGrams,
  };
}

function scoreToken(token: string, entry: Indexed): number {
  if (entry.nameText.includes(` ${token}`)) return 10;
  if (entry.aliasText.includes(` ${token}`)) return 7;
  if (token.length >= 3 && entry.nameText.includes(token)) return 5;
  if (token.length >= 3 && entry.aliasText.includes(token)) return 3;

  if (token.length >= 4) {
    // One typo is tolerated; comparing with the word start handles half-typed words.
    const allowed = token.length >= 8 ? 2 : 1;
    const words = [...entry.nameWords, ...entry.aliasText.trim().split(' ')];
    for (const word of words) {
      if (
        levenshtein(token, word, allowed) <= allowed ||
        levenshtein(token, word.slice(0, token.length), allowed) <= allowed
      ) {
        return 2;
      }
    }
  }
  return 0;
}

/**
 * Searches the built-in catalog by name, Turkish or English alias, and typo.
 * Every word of the query must match; results are best match first.
 */
export function searchCatalog(
  query: string,
  limit = CATALOG_RESULT_LIMIT,
): CatalogFood[] {
  const normalized = normalizeSearchText(query);
  const tokens = normalized.split(' ').filter(Boolean);
  if (tokens.length === 0) return [];

  const scored: { entry: Indexed; score: number; position: number }[] = [];
  index.forEach((entry, position) => {
    let total = 0;
    for (const token of tokens) {
      const score = scoreToken(token, entry);
      if (score === 0) return;
      total += score;
    }
    if (entry.nameText.trim().startsWith(normalized)) total += 6;
    scored.push({ entry, score: total, position });
  });

  return scored
    .sort((a, b) => b.score - a.score || a.position - b.position)
    .slice(0, limit)
    .map(({ entry }) => toCatalogFood(entry.record));
}

/** Number of foods in the built-in catalog. */
export const CATALOG_SIZE = FOOD_CATALOG_DATA.length;
