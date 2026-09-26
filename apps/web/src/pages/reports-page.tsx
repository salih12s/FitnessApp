import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, BarChart3, ChevronDown } from 'lucide-react';
import * as m from 'motion/react-m';
import { useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  getExerciseReport,
  getReportExercises,
  reportKeys,
} from '@/api/reports';
import { FeedbackPanel } from '@/components/common/feedback-panel';
import { PageHeader } from '@/components/common/page-header';
import { toChartPoints, type ChartPoint } from '@/lib/report-series';
import { formatWeight, formatWeightChange } from '@/lib/format';
import type { ReportRange } from '@/types/report';

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const shortDateFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
});

function ProgressTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload: ChartPoint }>;
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  return (
    <div className="min-w-44 rounded-md border border-border-strong bg-surface p-3 shadow-[0_12px_32px_-12px_var(--shadow-tint)]">
      <p className="text-xs text-muted-foreground">
        {dateFormatter.format(new Date(point.performedAt))}
      </p>
      <p className="metric-number mt-0.5 text-lg font-semibold text-foreground">
        {formatWeight(point.maxWeightKg)} kg
      </p>
      <ul className="metric-number mt-2 space-y-0.5 border-t border-border pt-2 text-xs text-muted-foreground">
        {point.sets.map((set) => (
          <li key={set.id}>
            {formatWeight(set.weightKg)} kg × {set.reps}
          </li>
        ))}
      </ul>
    </div>
  );
}

const chartTick = {
  fill: 'var(--text-secondary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
};

function ReportsLoading() {
  return (
    <div
      aria-label="Rapor yükleniyor"
      className="skeleton mt-6 h-80 rounded-lg border border-border"
      role="status"
    />
  );
}

const rangeOptions = [
  ['30d', '30 gün'],
  ['3m', '3 ay'],
  ['6m', '6 ay'],
  ['all', 'Tümü'],
] as const;

function MetricCard({
  label,
  value,
  index,
  accent = false,
}: {
  label: string;
  value: string;
  index: number;
  accent?: boolean;
}) {
  return (
    <div
      className="animate-rise rounded-lg border border-border bg-surface p-4"
      style={{ '--i': index }}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`metric-number mt-1 text-xl font-semibold sm:text-2xl ${
          accent ? 'text-primary' : 'text-foreground'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export function ReportsPage() {
  const [selectedExerciseId, setSelectedExerciseId] = useState('');
  const [range, setRange] = useState<ReportRange>('all');
  const exercisesQuery = useQuery({
    queryKey: reportKeys.exercises,
    queryFn: getReportExercises,
    retry: 1,
  });

  const activeExercise =
    exercisesQuery.data?.find(
      (exercise) => exercise.id === selectedExerciseId,
    ) ?? exercisesQuery.data?.[0];

  const reportQuery = useQuery({
    queryKey: reportKeys.detail(
      activeExercise?.slug ?? '',
      activeExercise?.isCustom ?? false,
      range,
    ),
    queryFn: () =>
      getExerciseReport(
        activeExercise?.slug ?? '',
        activeExercise?.isCustom ?? false,
        range,
      ),
    enabled: Boolean(activeExercise),
    retry: 1,
  });
  const chartData = toChartPoints(reportQuery.data?.points ?? [], (date) =>
    shortDateFormatter.format(date),
  );
  const summary = reportQuery.data?.summary;
  const formattedIncrease = summary
    ? `${formatWeightChange(summary.increaseKg)} kg`
    : '';

  return (
    <div>
      <PageHeader
        description="Çalışma ağırlığının zaman içindeki değişimini, rekorlarını ve toplam gelişimini incele."
        title="Raporlar"
      />

      {exercisesQuery.isPending ? <ReportsLoading /> : null}
      {exercisesQuery.isError ? (
        <div className="mt-8">
          <FeedbackPanel
            actionLabel="Tekrar dene"
            description="Hareket geçmişin alınamadı. Yeniden deneyebilirsin."
            icon={AlertTriangle}
            isActionPending={exercisesQuery.isFetching}
            onAction={() => void exercisesQuery.refetch()}
            title="Raporlar yüklenemedi"
          />
        </div>
      ) : null}
      {exercisesQuery.isSuccess && exercisesQuery.data.length === 0 ? (
        <div className="mt-8">
          <FeedbackPanel
            description="Bir egzersiz sayfasından antrenman kaydettiğinde gelişimini burada görebileceksin."
            icon={BarChart3}
            title="Henüz raporlanacak antrenman yok"
          />
        </div>
      ) : null}

      {exercisesQuery.isSuccess && exercisesQuery.data.length > 0 ? (
        <div className="mt-6 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative sm:w-80">
              <label className="sr-only" htmlFor="report-exercise">
                Hareket seç
              </label>
              <select
                className="min-h-12 w-full cursor-pointer appearance-none rounded-md border border-border-strong bg-surface px-4 pr-11 text-[0.9375rem] font-semibold text-foreground shadow-[0_1px_2px_var(--shadow-tint)] outline-none transition-[border-color,box-shadow] focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring"
                id="report-exercise"
                onChange={(event) => setSelectedExerciseId(event.target.value)}
                value={activeExercise?.id ?? ''}
              >
                {exercisesQuery.data.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
            </div>

            <div
              aria-label="Zaman aralığı"
              className="grid grid-cols-4 rounded-md bg-surface-strong p-1"
              role="group"
            >
              {rangeOptions.map(([value, label]) => (
                <button
                  aria-pressed={range === value}
                  className={`relative min-h-10 cursor-pointer rounded-sm px-3 text-sm outline-none transition-colors duration-200 focus-visible:ring-3 focus-visible:ring-ring sm:px-4 ${
                    range === value
                      ? 'font-semibold text-foreground'
                      : 'font-medium text-muted-foreground hover:text-foreground'
                  }`}
                  key={value}
                  onClick={() => setRange(value)}
                  type="button"
                >
                  {range === value ? (
                    <m.span
                      aria-hidden="true"
                      className="absolute inset-0 rounded-sm bg-surface shadow-[0_1px_2px_var(--shadow-tint)]"
                      layoutId="report-range-indicator"
                      transition={{
                        type: 'spring',
                        stiffness: 520,
                        damping: 40,
                      }}
                    />
                  ) : null}
                  <span className="relative">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {reportQuery.isPending ? <ReportsLoading /> : null}
          {reportQuery.isError ? (
            <FeedbackPanel
              actionLabel="Tekrar dene"
              description="Bu hareketin gelişim verisi alınamadı."
              icon={AlertTriangle}
              isActionPending={reportQuery.isFetching}
              onAction={() => void reportQuery.refetch()}
              title="Gelişim verisi yüklenemedi"
            />
          ) : null}
          {summary ? (
            <>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                <MetricCard
                  index={0}
                  label="Başlangıç"
                  value={`${formatWeight(summary.startingWeightKg)} kg`}
                />
                <MetricCard
                  index={1}
                  label="Güncel"
                  value={`${formatWeight(summary.currentWeightKg)} kg`}
                />
                <MetricCard
                  accent
                  index={2}
                  label="Kişisel rekor"
                  value={`${formatWeight(summary.personalRecordKg)} kg`}
                />
                <MetricCard
                  index={3}
                  label="Toplam artış"
                  value={formattedIncrease}
                />
              </div>

              <section
                aria-labelledby="progress-chart-title"
                className="animate-rise rounded-lg border border-border bg-surface p-4 sm:p-5"
                style={{ '--i': 4 }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2
                      className="text-base font-semibold text-foreground"
                      id="progress-chart-title"
                    >
                      Ağırlık ilerlemesi
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Her nokta, o antrenmandaki en yüksek çalışma ağırlığı.
                    </p>
                  </div>
                  {summary.improvementPercentage !== null ? (
                    <p className="shrink-0 text-right">
                      <span className="metric-number block text-2xl font-semibold text-primary">
                        %{summary.improvementPercentage.toLocaleString('tr-TR')}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        toplam gelişim
                      </span>
                    </p>
                  ) : null}
                </div>

                <div className="mt-4 h-72 w-full min-w-0 sm:h-80">
                  <ResponsiveContainer height="100%" width="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 12, right: 20, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="progressArea"
                          x1="0"
                          x2="0"
                          y1="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="var(--primary)"
                            stopOpacity={0.2}
                          />
                          <stop
                            offset="100%"
                            stopColor="var(--primary)"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        stroke="var(--border)"
                        strokeDasharray="3 5"
                        vertical={false}
                      />
                      <XAxis
                        axisLine={false}
                        dataKey="chartLabel"
                        minTickGap={18}
                        tick={chartTick}
                        tickLine={false}
                      />
                      <YAxis
                        axisLine={false}
                        domain={['auto', 'auto']}
                        tick={chartTick}
                        tickFormatter={(value: number) => formatWeight(value)}
                        tickLine={false}
                        width={48}
                      />
                      <Tooltip
                        content={<ProgressTooltip />}
                        cursor={{
                          stroke: 'var(--border-strong)',
                          strokeDasharray: '3 3',
                        }}
                      />
                      <Area
                        activeDot={{
                          fill: 'var(--primary)',
                          r: 5,
                          stroke: 'var(--surface)',
                          strokeWidth: 2,
                        }}
                        dataKey="maxWeightNumber"
                        dot={{
                          fill: 'var(--surface)',
                          r: 3,
                          stroke: 'var(--primary)',
                          strokeWidth: 2,
                        }}
                        fill="url(#progressArea)"
                        stroke="var(--primary)"
                        strokeWidth={2}
                        type="monotone"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </>
          ) : null}
          {reportQuery.data?.summary === null ? (
            <FeedbackPanel
              description="Bu hareket için seçilen aralıkta kayıt bulunamadı."
              icon={BarChart3}
              title="Veri yok"
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
