import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Copy } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';

import {
  copyFoodEntries,
  getFoodLibrary,
  getNutritionDay,
  nutritionKeys,
} from '@/api/nutrition';
import { FeedbackPanel } from '@/components/common/feedback-panel';
import { PageHeader } from '@/components/common/page-header';
import { DayNavigator } from '@/components/nutrition/day-navigator';
import { MealSection } from '@/components/nutrition/meal-section';
import { NutritionGoalForm } from '@/components/nutrition/nutrition-goal-form';
import { NutritionSummary } from '@/components/nutrition/nutrition-summary';
import { NutritionTrend } from '@/components/nutrition/nutrition-trend';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { toDateKey } from '@/lib/history-groups';
import { addDays, isDateKey } from '@/lib/nutrition';

function NutritionLoading() {
  return (
    <div
      aria-label="Beslenme kayıtları yükleniyor"
      className="mt-6 space-y-4"
      role="status"
    >
      <div aria-hidden="true" className="skeleton h-56 rounded-lg" />
      {Array.from({ length: 4 }, (_, index) => (
        <div
          aria-hidden="true"
          className="skeleton h-20 rounded-lg"
          key={index}
        />
      ))}
    </div>
  );
}

export function NutritionPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const todayKey = toDateKey(new Date());
  const requested = searchParams.get('d');
  const date = requested && isDateKey(requested) ? requested : todayKey;

  function selectDate(next: string) {
    setCopyMessage(null);
    setSearchParams(next === todayKey ? {} : { d: next }, { replace: true });
  }

  const dayQuery = useQuery({
    queryKey: nutritionKeys.day(date),
    queryFn: () => getNutritionDay(date),
    retry: 1,
  });
  const libraryQuery = useQuery({
    queryKey: nutritionKeys.foods,
    queryFn: getFoodLibrary,
    retry: 1,
  });

  const copyDayMutation = useMutation({
    mutationFn: () =>
      copyFoodEntries({ fromDate: addDays(date, -1), toDate: date }),
    onSuccess: async () => {
      setCopyMessage(null);
      await queryClient.invalidateQueries({ queryKey: nutritionKeys.all });
    },
    onError: (error) =>
      setCopyMessage(
        error instanceof ApiError && error.status === 404
          ? 'Dün için kopyalanacak kayıt yok.'
          : 'Kopyalanamadı. Yeniden deneyebilirsin.',
      ),
  });

  const day = dayQuery.data;
  const entryCount = day?.meals.reduce(
    (sum, group) => sum + group.entries.length,
    0,
  );

  return (
    <div>
      <PageHeader
        action={
          <DayNavigator date={date} onChange={selectDate} todayKey={todayKey} />
        }
        description="Ne yediğini, kaç kalori ve makro aldığını kaydet, hedefine ne kadar yaklaştığını gör."
        title="Beslenme"
      />

      {dayQuery.isPending ? <NutritionLoading /> : null}

      {dayQuery.isError ? (
        <div className="mt-6">
          <FeedbackPanel
            actionLabel="Tekrar dene"
            description="Bu günün kayıtları alınamadı. Bağlantını kontrol edip tekrar deneyebilirsin."
            icon={AlertTriangle}
            isActionPending={dayQuery.isFetching}
            onAction={() => void dayQuery.refetch()}
            title="Beslenme kayıtları yüklenemedi"
          />
        </div>
      ) : null}

      {day ? (
        <div className="mt-6 space-y-4">
          {isEditingGoal ? (
            <NutritionGoalForm
              goal={day.goal}
              onDone={() => setIsEditingGoal(false)}
            />
          ) : (
            <NutritionSummary
              goal={day.goal}
              onEditGoal={() => setIsEditingGoal(true)}
              totals={day.totals}
            />
          )}

          {entryCount === 0 ? (
            <div className="animate-rise flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-border-strong px-4 py-3 sm:px-5">
              <p className="min-w-0 flex-1 text-sm text-muted-foreground">
                Bu gün henüz boş. Öğünlerine yiyecek ekle ya da dünkü öğünleri
                tek dokunuşla kopyala.
              </p>
              <Button
                disabled={copyDayMutation.isPending}
                onClick={() => copyDayMutation.mutate()}
                variant="secondary"
              >
                <Copy aria-hidden="true" className="size-4" />
                {copyDayMutation.isPending ? 'Kopyalanıyor…' : 'Dünü kopyala'}
              </Button>
              {copyMessage ? (
                <p
                  className="w-full text-xs text-muted-foreground"
                  role="status"
                >
                  {copyMessage}
                </p>
              ) : null}
            </div>
          ) : null}

          {day.meals.map((group, index) => (
            <MealSection
              date={date}
              group={group}
              index={index}
              key={group.meal}
              library={libraryQuery.data}
            />
          ))}
        </div>
      ) : null}

      <div className="mt-10">
        <NutritionTrend
          onSelectDate={selectDate}
          selectedDate={date}
          todayKey={todayKey}
        />
      </div>
    </div>
  );
}
