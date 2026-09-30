import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DailyQuota,
  detectImageType,
  MAX_DETECTED_ITEMS,
  PHOTO_ANALYSIS_SCHEMA,
  sanitizeAnalysis,
} from './photo-analysis.js';

const item = (overrides: Record<string, unknown> = {}) => ({
  name: 'Izgara tavuk göğsü',
  servingLabel: '~150 g',
  grams: 150,
  calories: 248,
  proteinG: 46.5,
  carbsG: 0,
  fatG: 5.4,
  confidence: 'medium',
  ...overrides,
});

describe('detectImageType', () => {
  it('recognizes JPEG, PNG, and WebP by their first bytes', () => {
    assert.equal(
      detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0])),
      'image/jpeg',
    );
    assert.equal(
      detectImageType(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]),
      ),
      'image/png',
    );
    assert.equal(
      detectImageType(
        Buffer.concat([
          Buffer.from('RIFF'),
          Buffer.alloc(4),
          Buffer.from('WEBP'),
        ]),
      ),
      'image/webp',
    );
  });

  it('rejects everything else, whatever the header claims', () => {
    assert.equal(
      detectImageType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')),
      null,
    );
    assert.equal(detectImageType(Buffer.from('GIF89a')), null);
    assert.equal(detectImageType(Buffer.from('%PDF-1.7')), null);
    assert.equal(detectImageType(Buffer.alloc(0)), null);
    assert.equal(detectImageType(Buffer.from([0xff, 0xd8])), null);
  });
});

describe('schema', () => {
  it('asks for every field the code reads, and nothing else', () => {
    const itemSchema = PHOTO_ANALYSIS_SCHEMA.properties.items.items;
    assert.deepEqual(
      [...itemSchema.required].sort(),
      Object.keys(itemSchema.properties).sort(),
    );
    assert.equal(itemSchema.additionalProperties, false);
  });
});

describe('sanitizeAnalysis', () => {
  it('passes a well-formed answer through', () => {
    const result = sanitizeAnalysis({
      items: [item()],
      note: 'Sos eklenmiş olabilir.',
    });
    assert.deepEqual(result, {
      items: [
        {
          name: 'Izgara tavuk göğsü',
          servingLabel: '~150 g',
          grams: 150,
          calories: 248,
          proteinG: 46.5,
          carbsG: 0,
          fatG: 5.4,
          confidence: 'medium',
        },
      ],
      note: 'Sos eklenmiş olabilir.',
    });
  });

  it('bounds numbers and rounds them', () => {
    const [food] = sanitizeAnalysis({
      items: [
        item({
          calories: 99999.7,
          proteinG: -5,
          carbsG: 700,
          fatG: 3.456,
          grams: 99999,
        }),
      ],
    }).items;
    assert.equal(food.calories, 5000);
    assert.equal(food.proteinG, 0);
    assert.equal(food.carbsG, 500);
    assert.equal(food.fatG, 3.5);
    assert.equal(food.grams, 3000);
  });

  it('drops items with no name or no usable calories', () => {
    const result = sanitizeAnalysis({
      items: [
        item({ name: '   ' }),
        item({ name: 42 }),
        item({ calories: 'çok' }),
        item({ calories: Number.NaN }),
        item({ calories: null }),
        null,
        'x',
        item({ name: 'Elma', calories: 95 }),
      ],
    });
    assert.deepEqual(
      result.items.map(({ name }) => name),
      ['Elma'],
    );
  });

  it('keeps zero-calorie items such as water', () => {
    const [food] = sanitizeAnalysis({
      items: [
        item({ name: 'Su', calories: 0, proteinG: 0, fatG: 0, grams: 200 }),
      ],
    }).items;
    assert.equal(food.calories, 0);
  });

  it('keeps at most twelve items', () => {
    const items = Array.from({ length: 30 }, (_, index) =>
      item({ name: `Yemek ${index}` }),
    );
    assert.equal(sanitizeAnalysis({ items }).items.length, MAX_DETECTED_ITEMS);
  });

  it('cleans text and caps its length', () => {
    const result = sanitizeAnalysis({
      items: [
        item({
          name: `  Pilav\u0000\n${'a'.repeat(300)}`,
          servingLabel: 'b'.repeat(200),
        }),
      ],
      note: `x${'y'.repeat(500)}`,
    });
    assert.ok(result.items[0].name.startsWith('Pilav a'));
    assert.equal(result.items[0].name.length, 120);
    assert.equal(result.items[0].servingLabel.length, 60);
    assert.equal(result.note?.length, 300);
  });

  it('fills in a missing serving label and an unknown confidence', () => {
    const [food] = sanitizeAnalysis({
      items: [item({ servingLabel: '', confidence: 'certain' })],
    }).items;
    assert.equal(food.servingLabel, '~150 g');
    assert.equal(food.confidence, 'low');
  });

  it('lowers confidence when the calories disagree with the macros', () => {
    const [food] = sanitizeAnalysis({
      items: [
        item({
          calories: 900,
          proteinG: 10,
          carbsG: 5,
          fatG: 2,
          confidence: 'high',
        }),
      ],
    }).items;
    assert.equal(food.confidence, 'low');
    const [fine] = sanitizeAnalysis({
      items: [item({ confidence: 'high' })],
    }).items;
    assert.equal(fine.confidence, 'high');
  });

  it('returns an empty result for an unusable answer', () => {
    for (const raw of [
      null,
      undefined,
      'x',
      42,
      {},
      { items: 'x' },
      { items: [] },
    ]) {
      assert.deepEqual(sanitizeAnalysis(raw), { items: [], note: null });
    }
  });
});

describe('DailyQuota', () => {
  it('allows a user up to their limit, then stops them', () => {
    const quota = new DailyQuota(100);
    assert.equal(quota.consume('a', 2, '2026-09-30'), 'ok');
    assert.equal(quota.consume('a', 2, '2026-09-30'), 'ok');
    assert.equal(quota.consume('a', 2, '2026-09-30'), 'user');
  });

  it('counts each user separately', () => {
    const quota = new DailyQuota(100);
    quota.consume('a', 1, '2026-09-30');
    assert.equal(quota.consume('a', 1, '2026-09-30'), 'user');
    assert.equal(quota.consume('b', 1, '2026-09-30'), 'ok');
  });

  it('applies the limit it is given, so demo accounts can have a lower one', () => {
    const quota = new DailyQuota(100);
    assert.equal(quota.consume('demo', 1, '2026-09-30'), 'ok');
    assert.equal(quota.consume('demo', 1, '2026-09-30'), 'user');
    assert.equal(quota.consume('member', 5, '2026-09-30'), 'ok');
  });

  it('stops everyone once the site-wide limit is reached', () => {
    const quota = new DailyQuota(2);
    assert.equal(quota.consume('a', 10, '2026-09-30'), 'ok');
    assert.equal(quota.consume('b', 10, '2026-09-30'), 'ok');
    assert.equal(quota.consume('c', 10, '2026-09-30'), 'global');
    assert.equal(quota.consume('a', 10, '2026-09-30'), 'global');
  });

  it('does not spend the quota on a refused request', () => {
    const quota = new DailyQuota(2);
    quota.consume('a', 1, '2026-09-30');
    assert.equal(quota.consume('a', 1, '2026-09-30'), 'user');
    assert.equal(quota.consume('b', 1, '2026-09-30'), 'ok');
    assert.equal(quota.consume('c', 1, '2026-09-30'), 'global');
  });

  it('starts fresh on a new day', () => {
    const quota = new DailyQuota(1);
    assert.equal(quota.consume('a', 1, '2026-09-30'), 'ok');
    assert.equal(quota.consume('a', 1, '2026-09-30'), 'global');
    assert.equal(quota.consume('a', 1, '2026-10-01'), 'ok');
  });
});
