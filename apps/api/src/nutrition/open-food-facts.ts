import { cleanText } from './clean-text.js';
import type { CatalogFood } from './food-catalog.js';

/**
 * Packaged-product search on Open Food Facts (openfoodfacts.org), a community
 * database published under the Open Database License. It is used only when a
 * user asks for packaged products, because the service is rate limited and can
 * be slow or unavailable.
 */

const SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl';
const USER_AGENT = 'FitnessApp/0.1 (https://fitnessapp.salihsydm.com)';
const TIMEOUT_MS = 8_000;
const PAGE_SIZE = 20;
const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 200;

const cache = new Map<string, { at: number; foods: CatalogFood[] }>();

export class PackagedFoodsUnavailableError extends Error {}

function num(value: unknown): number | null {
  const parsed = typeof value === 'string' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : null;
}

const round1 = (value: number): number => Math.round(value * 10) / 10;

/**
 * Turns an Open Food Facts search response into catalog foods. Products
 * without a name or usable nutrition values, and values that cannot be right
 * (more than 100 g of macros in 100 g of food), are dropped.
 */
export function mapPackagedProducts(payload: unknown): CatalogFood[] {
  const products =
    typeof payload === 'object' &&
    payload !== null &&
    'products' in payload &&
    Array.isArray(payload.products)
      ? (payload.products as unknown[])
      : [];

  const foods: CatalogFood[] = [];
  const seen = new Set<string>();

  for (const raw of products) {
    if (typeof raw !== 'object' || raw === null) continue;
    const product = raw as Record<string, unknown>;
    const nutriments = (product.nutriments ?? {}) as Record<string, unknown>;

    const code = cleanText(product.code, 32);
    const name =
      cleanText(product.product_name_tr, 120) ||
      cleanText(product.product_name, 120);
    const calories = num(nutriments['energy-kcal_100g']);
    if (!code || !name || calories === null || seen.has(code)) continue;

    const proteinG = num(nutriments.proteins_100g) ?? 0;
    const carbsG = num(nutriments.carbohydrates_100g) ?? 0;
    const fatG = num(nutriments.fat_100g) ?? 0;
    const inRange = [proteinG, carbsG, fatG].every((g) => g >= 0 && g <= 100);
    if (calories < 0 || calories > 900 || !inRange) continue;
    if (proteinG + carbsG + fatG > 105) continue;

    const servingGrams = num(product.serving_quantity);
    const hasServing =
      servingGrams !== null && servingGrams >= 1 && servingGrams <= 1000;
    const grams = hasServing ? servingGrams : 100;
    const label = cleanText(product.serving_size, 60);

    seen.add(code);
    foods.push({
      id: `off-${code}`,
      name,
      brand:
        cleanText(product.brands, 200).split(',')[0]?.trim().slice(0, 60) ||
        null,
      category: null,
      source: 'openfoodfacts',
      per100g: {
        calories: Math.round(calories),
        proteinG: round1(proteinG),
        carbsG: round1(carbsG),
        fatG: round1(fatG),
      },
      servingLabel: hasServing ? label || `${round1(grams)} g` : '100 g',
      servingGrams: grams,
    });
  }

  return foods;
}

function cacheKey(query: string): string {
  return query.trim().toLocaleLowerCase('tr-TR');
}

/** Searches packaged products; throws `PackagedFoodsUnavailableError` on any failure. */
export async function searchPackagedFoods(
  query: string,
): Promise<CatalogFood[]> {
  const key = cacheKey(query);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.foods;

  const url = new URL(SEARCH_URL);
  url.search = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: String(PAGE_SIZE),
    sort_by: 'unique_scans_n',
    fields:
      'code,product_name,product_name_tr,brands,nutriments,serving_size,serving_quantity',
  }).toString();

  let payload: unknown;
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    payload = await response.json();
  } catch {
    throw new PackagedFoodsUnavailableError();
  }

  const foods = mapPackagedProducts(payload);
  if (cache.size >= CACHE_MAX_ENTRIES) {
    // Map keeps insertion order, so the first key is the oldest.
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { at: Date.now(), foods });
  return foods;
}
