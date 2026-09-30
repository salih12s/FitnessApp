import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Apple,
  ChevronRight,
  Coffee,
  Copy,
  Plus,
  Sandwich,
  Soup,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';

import { copyFoodEntries, nutritionKeys } from '@/api/nutrition';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import {
  addDays,
  formatCalories,
  formatGrams,
  mealLabels,
} from '@/lib/nutrition';
import type { FoodLibrary, MealGroup } from '@/types/nutrition';

import { AddFoodPanel } from './add-food-panel';
import { FoodEntryForm } from './food-entry-form';

const mealIcons: Record<MealGroup['meal'], LucideIcon> = {
  breakfast: Coffee,
  lunch: Sandwich,
  dinner: Soup,
  snack: Apple,
};

interface MealSectionProps {
  group: MealGroup;
  date: string;
  library?: FoodLibrary;
  index: number;
}

export function MealSection({ group, date, library, index }: MealSectionProps) {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const Icon = mealIcons[group.meal];
  const label = mealLabels[group.meal];
  const isEmpty = group.entries.length === 0;

  const copyMutation = useMutation({
    mutationFn: () =>
      copyFoodEntries({
        fromDate: addDays(date, -1),
        toDate: date,
        meal: group.meal,
      }),
    onSuccess: async () => {
      setCopyMessage(null);
      await queryClient.invalidateQueries({ queryKey: nutritionKeys.all });
    },
    onError: (error) =>
      setCopyMessage(
        error instanceof ApiError && error.status === 404
          ? 'Dün bu öğünde kayıt yok.'
          : 'Kopyalanamadı. Yeniden deneyebilirsin.',
      ),
  });

  return (
    <section
      aria-labelledby={`meal-${group.meal}`}
      className="animate-rise rounded-lg border border-border bg-surface"
      style={{ '--i': index + 2 }}
    >
      <header className="flex items-center gap-3 p-4 sm:px-5">
        <span className="grid size-9 shrink-0 place-items-center rounded-sm bg-surface-strong text-muted-foreground">
          <Icon aria-hidden="true" className="size-4.5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <h3
            className="text-[0.9375rem] font-semibold text-foreground"
            id={`meal-${group.meal}`}
          >
            {label}
          </h3>
          <p className="metric-number text-xs text-muted-foreground">
            {isEmpty
              ? 'Henüz kayıt yok'
              : `${formatCalories(group.totals.calories)} kcal · P ${formatGrams(group.totals.proteinG)} · K ${formatGrams(group.totals.carbsG)} · Y ${formatGrams(group.totals.fatG)}`}
          </p>
        </div>
        {!isAdding ? (
          <Button
            aria-label={`${label} öğününe ekle`}
            className="h-10 min-h-10 px-3.5"
            onClick={() => {
              setEditingId(null);
              setIsAdding(true);
            }}
            variant="secondary"
          >
            <Plus aria-hidden="true" className="size-4" />
            Ekle
          </Button>
        ) : null}
      </header>

      {!isEmpty ? (
        <ul className="border-t border-border">
          {group.entries.map((entry) =>
            editingId === entry.id ? (
              <li
                className="border-b border-border bg-surface-elevated p-4 last:border-b-0 sm:px-5"
                key={entry.id}
              >
                <FoodEntryForm
                  date={date}
                  entry={entry}
                  library={library}
                  meal={group.meal}
                  onDone={() => setEditingId(null)}
                />
              </li>
            ) : (
              <li
                className="border-b border-border last:border-b-0"
                key={entry.id}
              >
                <button
                  aria-label={`${entry.name} kaydını düzenle`}
                  className="group flex min-h-16 w-full cursor-pointer items-center gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-surface-elevated focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring sm:px-5"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingId(entry.id);
                  }}
                  type="button"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.9375rem] font-medium text-foreground">
                      {entry.name}
                    </span>
                    <span className="metric-number block truncate text-xs text-muted-foreground">
                      {entry.servingLabel ? `${entry.servingLabel} · ` : ''}P{' '}
                      {formatGrams(entry.proteinG)} · K{' '}
                      {formatGrams(entry.carbsG)} · Y {formatGrams(entry.fatG)}
                    </span>
                  </span>
                  <span className="metric-number shrink-0 text-right text-[0.9375rem] font-semibold text-foreground">
                    {formatCalories(entry.calories)}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      kcal
                    </span>
                  </span>
                  <ChevronRight
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  />
                </button>
              </li>
            ),
          )}
        </ul>
      ) : null}

      {isEmpty && !isAdding ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border px-4 py-3 sm:px-5">
          <Button
            className="h-10 min-h-10 px-3 text-xs"
            disabled={copyMutation.isPending}
            onClick={() => copyMutation.mutate()}
            variant="ghost"
          >
            <Copy aria-hidden="true" className="size-3.5" />
            {copyMutation.isPending ? 'Kopyalanıyor…' : 'Dünkü öğünü kopyala'}
          </Button>
          {copyMessage ? (
            <p className="text-xs text-muted-foreground" role="status">
              {copyMessage}
            </p>
          ) : null}
        </div>
      ) : null}

      {isAdding ? (
        <div className="border-t border-border bg-surface-elevated p-4 sm:p-5">
          <AddFoodPanel
            date={date}
            library={library}
            meal={group.meal}
            onDone={() => setIsAdding(false)}
          />
        </div>
      ) : null}
    </section>
  );
}
