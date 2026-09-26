import type { ReportPoint } from '@/types/report';

export interface ChartPoint extends ReportPoint {
  chartLabel: string;
  maxWeightNumber: number;
}

export function toChartPoints(
  points: ReportPoint[],
  formatLabel: (date: Date) => string,
): ChartPoint[] {
  return points.map((point) => ({
    ...point,
    chartLabel: formatLabel(new Date(point.performedAt)),
    maxWeightNumber: Number(point.maxWeightKg),
  }));
}
