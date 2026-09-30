import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { FOOD_CATALOG_DATA } from './food-catalog.data.js';
import { CATALOG_SIZE, searchCatalog } from './food-catalog.js';

function names(query: string): string[] {
  return searchCatalog(query).map(({ name }) => name);
}

describe('catalog data', () => {
  it('has unique ids and names', () => {
    const ids = new Set(FOOD_CATALOG_DATA.map(({ id }) => id));
    const foodNames = new Set(FOOD_CATALOG_DATA.map(({ name }) => name));
    assert.equal(ids.size, CATALOG_SIZE);
    assert.equal(foodNames.size, CATALOG_SIZE);
  });

  it('has sane per-100 g values', () => {
    for (const food of FOOD_CATALOG_DATA) {
      assert.ok(food.calories >= 0 && food.calories <= 900, food.name);
      for (const grams of [food.proteinG, food.carbsG, food.fatG]) {
        assert.ok(grams >= 0 && grams <= 100, food.name);
      }
      // Macros cannot weigh more than the food itself.
      assert.ok(food.proteinG + food.carbsG + food.fatG <= 100.5, food.name);
      assert.ok(food.servingGrams > 0 && food.servingGrams <= 1000, food.name);
      assert.ok(food.servingLabel.length > 0, food.name);
    }
  });

  it('roughly agrees with the Atwater factors (4, 4, 9 kcal per gram)', () => {
    // Alcohol adds 7 kcal per gram that the three macros do not include.
    const alcoholic = new Set(['Bira', 'Kırmızı şarap']);
    for (const food of FOOD_CATALOG_DATA) {
      if (alcoholic.has(food.name)) continue;
      // Fiber and sugar alcohols make some foods differ; only a large gap
      // points to a wrong record.
      const estimate = food.proteinG * 4 + food.carbsG * 4 + food.fatG * 9;
      assert.ok(
        Math.abs(estimate - food.calories) <=
          Math.max(60, food.calories * 0.35),
        `${food.name}: ${food.calories} kcal vs ${Math.round(estimate)} from macros`,
      );
    }
  });
});

describe('searchCatalog', () => {
  it('finds a food by its Turkish name', () => {
    assert.equal(names('tavuk göğsü')[0], 'Tavuk göğsü (pişmiş)');
    assert.ok(names('mercimek').includes('Mercimek (pişmiş)'));
  });

  it('ignores Turkish letters and case', () => {
    assert.deepEqual(names('YOĞURT'), names('yogurt'));
    assert.ok(names('sarimsak').includes('Sarımsak'));
  });

  it('finds a food by an English alias', () => {
    assert.ok(names('chicken breast').includes('Tavuk göğsü (pişmiş)'));
    assert.ok(names('oats').includes('Yulaf ezmesi (kuru)'));
  });

  it('finds a food by an alternative Turkish word', () => {
    assert.ok(names('pilav').includes('Pirinç pilavı (pişmiş)'));
    assert.ok(names('kaşar').includes('Kaşar / Cheddar peyniri'));
  });

  it('ignores word order', () => {
    assert.ok(names('pişmiş tavuk').includes('Tavuk göğsü (pişmiş)'));
  });

  it('tolerates a typo', () => {
    assert.ok(names('zeytinyagı').includes('Zeytinyağı'));
    assert.ok(names('domatez').includes('Domates'));
  });

  it('requires every word to match', () => {
    assert.ok(!names('tavuk somon').length);
  });

  it('returns nothing for gibberish or empty input', () => {
    assert.deepEqual(names('zzzzqqxx'), []);
    assert.deepEqual(names('   '), []);
  });

  it('ranks a name match above an alias match', () => {
    const [first] = searchCatalog('süt');
    assert.ok(first.name.startsWith('Süt'), first.name);
  });

  it('caps the number of results', () => {
    assert.equal(searchCatalog('e', 5).length <= 5, true);
    assert.ok(searchCatalog('pişmiş', 3).length <= 3);
  });

  it('reports values for 100 g and a serving', () => {
    const [egg] = searchCatalog('yumurta haşlanmış');
    assert.equal(egg.name, 'Yumurta (haşlanmış)');
    assert.equal(egg.per100g.calories, 155);
    assert.equal(egg.servingGrams, 50);
    assert.equal(egg.source, 'catalog');
  });
});
