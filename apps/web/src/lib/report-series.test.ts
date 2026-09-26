import { describe, expect, it } from 'vitest';

import { toChartPoints } from './report-series';

describe('report chart series', () => {
  it('keeps chronological API order and preserves decimal weights for plotting', () => {
    const points = toChartPoints(
      [
        {
          id: 'first',
          performedAt: '2026-01-01T00:00:00.000Z',
          maxWeightKg: '12.5',
          sets: [],
        },
        {
          id: 'last',
          performedAt: '2026-02-01T00:00:00.000Z',
          maxWeightKg: '22.75',
          sets: [],
        },
      ],
      (date) => date.toISOString().slice(0, 10),
    );

    expect(points.map((point) => point.id)).toEqual(['first', 'last']);
    expect(points.map((point) => point.maxWeightNumber)).toEqual([12.5, 22.75]);
  });
});
