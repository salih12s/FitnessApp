import { bestOneRepMax, setVolume } from '@/lib/strength';
import type { ReportPoint } from '@/types/report';

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
    maxWeightNumber: Number(point.maxWeightKg),
    oneRepMax: bestOneRepMax(point.sets),
    volume: setVolume(point.sets),
  }));
}
