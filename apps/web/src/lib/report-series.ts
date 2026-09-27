import { toDisplayWeight } from '@/lib/format';
import { bestOneRepMax, setVolume } from '@/lib/strength';
import type { ReportPoint } from '@/types/report';

/** Chart values are in the user's display unit so axis ticks stay round. */
export interface ChartPoint extends ReportPoint {
  chartLabel: string;
  maxWeightNumber: number;
  oneRepMax: number;
  volume: number;
}

export function toChartPoints(
  points: ReportPoint[],
  formatLabel: (date: Date) => string,
): ChartPoint[] {
  return points.map((point) => ({
    ...point,
    chartLabel: formatLabel(new Date(point.performedAt)),
    maxWeightNumber: toDisplayWeight(point.maxWeightKg),
    oneRepMax: toDisplayWeight(bestOneRepMax(point.sets)),
    volume: toDisplayWeight(setVolume(point.sets)),
  }));
}
