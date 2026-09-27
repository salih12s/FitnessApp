import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { chartTick, yAxisWidth } from '@/components/common/chart-style';
import {
  formatDisplayWeight,
  getWeightUnit,
  toDisplayWeight,
} from '@/lib/format';
import { parseCalendarDate } from '@/lib/measurement-form';
import type { BodyMeasurement } from '@/types/measurement';

const shortDateFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
});

interface WeightPoint {
  label: string;
  weight: number;
}

function WeightTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload: WeightPoint }>;
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  return (
    <div className="rounded-md border border-border-strong bg-surface px-3 py-2 shadow-[0_12px_32px_-12px_var(--shadow-tint)]">
      <p className="text-xs text-muted-foreground">{point.label}</p>
      <p className="metric-number text-base font-semibold text-foreground">
        {formatDisplayWeight(point.weight)} {getWeightUnit()}
      </p>
    </div>
  );
}

/** Body-weight trend in the reports chart style; needs two weigh-ins. */
export function BodyWeightChart({
  measurements,
}: {
  measurements: readonly BodyMeasurement[];
}) {
  const points: WeightPoint[] = measurements
    .filter((row) => row.weightKg !== null)
    .map((row) => ({
      label: shortDateFormatter.format(parseCalendarDate(row.measuredAt)),
      weight: toDisplayWeight(row.weightKg ?? 0),
    }))
    .reverse();

  if (points.length < 2) {
    return (
      <p className="rounded-md bg-surface-strong px-3 py-4 text-center text-sm text-muted-foreground">
        Kilo grafiği için en az iki tartı kaydı gerekiyor.
      </p>
    );
  }

  return (
    <div
      aria-label={`Kilo grafiği, ${points.length} kayıt`}
      className="h-48 w-full min-w-0"
      role="img"
    >
      <ResponsiveContainer height="100%" width="100%">
        <AreaChart
          data={points}
          margin={{ top: 8, right: 20, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="bodyWeightArea" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.2} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="var(--border)"
            strokeDasharray="3 5"
            vertical={false}
          />
          <XAxis
            axisLine={false}
            dataKey="label"
            minTickGap={18}
            tick={chartTick}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            domain={['auto', 'auto']}
            tick={chartTick}
            tickFormatter={(value: number) => formatDisplayWeight(value)}
            tickLine={false}
            width={yAxisWidth(points.map((point) => point.weight))}
          />
          <Tooltip
            content={<WeightTooltip />}
            cursor={{ stroke: 'var(--border-strong)', strokeDasharray: '3 3' }}
          />
          <Area
            activeDot={{
              fill: 'var(--primary)',
              r: 5,
              stroke: 'var(--surface)',
              strokeWidth: 2,
            }}
            dataKey="weight"
            dot={{
              fill: 'var(--surface)',
              r: 3,
              stroke: 'var(--primary)',
              strokeWidth: 2,
            }}
            fill="url(#bodyWeightArea)"
            stroke="var(--primary)"
            strokeWidth={2}
            type="monotone"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
