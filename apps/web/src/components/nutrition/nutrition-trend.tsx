import { useQuery } from '@tanstack/react-query';

import { getNutritionSummary, nutritionKeys } from '@/api/nutrition';
import { SectionHeading } from '@/components/common/section-heading';
import {
  addDays,
  averageCalories,
  formatCalories,
  formatShortDate,
  trendDays,
} from '@/lib/nutrition';
import { cn } from '@/lib/utils';

const DAYS = 14;

interface NutritionTrendProps {
  todayKey: string;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

/** Calories for the last two weeks against the daily goal. */
export function NutritionTrend({
  todayKey,
  selectedDate,
  onSelectDate,
}: NutritionTrendProps) {
  const summaryQuery = useQuery({
    queryKey: nutritionKeys.summary(todayKey, DAYS),
    queryFn: () => getNutritionSummary(todayKey, DAYS),
    retry: 1,
  });

  const summary = summaryQuery.data;
  const days = trendDays(summary?.days ?? [], todayKey, DAYS);
  const goal = summary?.goal?.calories ?? null;
  const average = averageCalories(days, todayKey);
  const peak = Math.max(goal ?? 0, ...days.map((day) => day.calories), 1);
  const scale = peak * 1.08;
  const hasData = days.some((day) => day.hasEntries);

  return (
    <section aria-labelledby="nutrition-trend-title">
      <SectionHeading
        description={
          average !== null
            ? `Kayıt olan günlerin ortalaması ${formatCalories(average)} kcal${goal ? `, hedef ${formatCalories(goal)} kcal` : ''}.`
            : 'Birkaç gün kayıt girdikçe eğilimin burada görünür.'
        }
        id="nutrition-trend-title"
        meta={`Son ${DAYS} gün`}
        title="Kalori eğilimi"
      />

      <div className="mt-4 rounded-lg border border-border bg-surface p-4 sm:p-5">
        {summaryQuery.isPending ? (
          <div aria-hidden="true" className="skeleton h-40 rounded-md" />
        ) : summaryQuery.isError ? (
          <p className="text-sm text-muted-foreground">
            Eğilim şu an yüklenemedi.
          </p>
        ) : (
          <div className="relative h-40">
            {goal ? (
              <div
                aria-hidden="true"
                className="absolute inset-x-0 border-t border-dashed border-border-strong"
                style={{ bottom: `${(goal / scale) * 100}%` }}
              >
                <span className="metric-number absolute -top-5 right-0 bg-surface pl-1 text-[0.6875rem] text-muted-foreground">
                  hedef {formatCalories(goal)}
                </span>
              </div>
            ) : null}

            <ul className="flex h-full items-end gap-1 sm:gap-1.5">
              {days.map((day) => {
                const isSelected = day.date === selectedDate;
                const height = Math.max(
                  day.hasEntries ? 3 : 0,
                  (day.calories / scale) * 100,
                );
                return (
                  <li
                    className="flex h-full min-w-0 flex-1 flex-col"
                    key={day.date}
                  >
                    <button
                      aria-label={`${formatShortDate(day.date)}: ${day.hasEntries ? `${formatCalories(day.calories)} kcal` : 'kayıt yok'}`}
                      aria-pressed={isSelected}
                      className="group flex min-h-0 flex-1 cursor-pointer items-end rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring"
                      onClick={() => onSelectDate(day.date)}
                      type="button"
                    >
                      <span
                        className={cn(
                          'block w-full origin-bottom rounded-t-sm transition-[background-color] duration-200',
                          day.date === todayKey || isSelected
                            ? 'bg-primary'
                            : day.hasEntries
                              ? 'bg-primary/40 group-hover:bg-primary/70'
                              : 'bg-surface-strong',
                        )}
                        style={{ height: `${height || 2}%` }}
                      />
                    </button>
                    <span
                      className={cn(
                        'metric-number mt-1.5 text-center text-[0.625rem]',
                        isSelected
                          ? 'font-semibold text-foreground'
                          : 'text-muted-foreground',
                      )}
                    >
                      {day.date.slice(8)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {!summaryQuery.isPending && !summaryQuery.isError && !hasData ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Son {DAYS} günde kayıt yok.{' '}
            {formatShortDate(addDays(todayKey, -(DAYS - 1)))} ile bugün arası
            boş.
          </p>
        ) : null}
      </div>
    </section>
  );
}
