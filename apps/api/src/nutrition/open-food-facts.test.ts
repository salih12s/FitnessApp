import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { mapPackagedProducts } from './open-food-facts.js';

const product = (overrides: Record<string, unknown> = {}) => ({
  code: '8690000000001',
  product_name: 'Yumurta',
  brands: 'Anadolu Çiftliği, Başka Marka',
  nutriments: {
    'energy-kcal_100g': 143,
    proteins_100g: 13,
    carbohydrates_100g: 0,
    fat_100g: 10.16,
  },
  serving_size: '1 yumurta (53-62 g)',
  serving_quantity: 58,
  ...overrides,
});

describe('mapPackagedProducts', () => {
  it('maps a product and keeps its first brand', () => {
    const [food] = mapPackagedProducts({ products: [product()] });
    assert.deepEqual(food, {
      id: 'off-8690000000001',
      name: 'Yumurta',
      brand: 'Anadolu Çiftliği',
      category: null,
      source: 'openfoodfacts',
      per100g: { calories: 143, proteinG: 13, carbsG: 0, fatG: 10.2 },
      servingLabel: '1 yumurta (53-62 g)',
      servingGrams: 58,
    });
  });

  it('falls back to 100 g when the serving is missing or unusable', () => {
    for (const serving_quantity of [undefined, 0, 5000, 'abc']) {
      const [food] = mapPackagedProducts({
        products: [product({ serving_quantity })],
      });
      assert.equal(food.servingGrams, 100);
      assert.equal(food.servingLabel, '100 g');
    }
  });

  it('prefers the Turkish name and accepts numbers sent as text', () => {
    const [food] = mapPackagedProducts({
      products: [
        product({
          product_name_tr: 'Tavuk yumurtası',
          nutriments: {
            'energy-kcal_100g': '143',
            proteins_100g: '13',
          },
        }),
      ],
    });
    assert.equal(food.name, 'Tavuk yumurtası');
    assert.equal(food.per100g.calories, 143);
    assert.equal(food.per100g.carbsG, 0);
  });

  it('drops products without a name, code, or energy value', () => {
    const result = mapPackagedProducts({
      products: [
        product({ product_name: '' }),
        product({ code: '' }),
        product({ nutriments: { proteins_100g: 10 } }),
      ],
    });
    assert.deepEqual(result, []);
  });

  it('drops values that cannot be right', () => {
    const impossible = [
      { 'energy-kcal_100g': 5000 },
      { 'energy-kcal_100g': -5 },
      { 'energy-kcal_100g': 100, proteins_100g: 150 },
      { 'energy-kcal_100g': 100, proteins_100g: 60, carbohydrates_100g: 60 },
      { 'energy-kcal_100g': Number.NaN },
    ];
    for (const nutriments of impossible) {
      assert.deepEqual(
        mapPackagedProducts({ products: [product({ nutriments })] }),
        [],
      );
    }
  });

  it('removes duplicates and control characters', () => {
    const result = mapPackagedProducts({
      products: [product({ product_name: 'Süt\u0000\nYağlı' }), product()],
    });
    assert.equal(result.length, 1);
    assert.equal(result[0].name, 'Süt Yağlı');
  });

  it('survives unexpected payloads', () => {
    for (const payload of [
      null,
      undefined,
      'x',
      42,
      {},
      { products: 'x' },
      { products: [null, 1, 'x'] },
    ]) {
      assert.deepEqual(mapPackagedProducts(payload), []);
    }
  });

  it('caps long names and brands', () => {
    const [food] = mapPackagedProducts({
      products: [
        product({ product_name: 'a'.repeat(500), brands: 'b'.repeat(500) }),
      ],
    });
    assert.equal(food.name.length, 120);
    assert.equal(food.brand?.length, 60);
  });
});
