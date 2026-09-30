import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, Trash2, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import {
  createFoodEntry,
  deleteFoodEntry,
  deleteSavedFood,
  nutritionKeys,
  updateFoodEntry,
} from '@/api/nutrition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api';
import {
  draftCalories,
  draftFromEntry,
  draftFromFood,
  emptyFoodDraft,
  formatCalories,
  isCaloriesDerived,
  toFoodInput,
  toFoodUpdate,
  validateFoodDraft,
  type FoodDraft,
  type FoodErrors,
} from '@/lib/nutrition';
import type {
  FoodEntry,
  FoodLibrary,
  KnownFood,
  Meal,
} from '@/types/nutrition';

interface FoodEntryFormProps {
  date: string;
  meal: Meal;
  /** Editing an existing entry when set; adding otherwise. */
  entry?: FoodEntry;
  /** Values to start from when adding, for example from a search result. */
  initialDraft?: FoodDraft;
  library?: FoodLibrary;
  onDone: () => void;
}

function errorMessage(error: unknown): string {
  return error instanceof ApiError && error.status === 400
    ? 'Kayıt kaydedilemedi. Değerleri kontrol et.'
    : 'Kayıt kaydedilemedi. Yeniden deneyebilirsin.';
}

function QuickPick({
  food,
  onPick,
  onRemove,
}: {
  food: KnownFood;
  onPick: () => void;
  onRemove?: () => void;
}) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-sm border border-border-strong bg-surface text-xs">
      <button
        className="min-h-9 cursor-pointer rounded-l-sm px-2.5 text-left font-medium text-foreground outline-none transition-colors hover:bg-surface-elevated focus-visible:ring-3 focus-visible:ring-ring"
        onClick={onPick}
        type="button"
      >
        {food.name}
        <span className="metric-number ml-1.5 text-muted-foreground">
          {formatCalories(food.calories)}
        </span>
      </button>
      {onRemove ? (
        <button
          aria-label={`${food.name} favorilerden kaldır`}
          className="grid size-9 cursor-pointer place-items-center rounded-r-sm text-muted-foreground outline-none transition-colors hover:text-destructive focus-visible:ring-3 focus-visible:ring-ring"
          onClick={onRemove}
          type="button"
        >
          <X aria-hidden="true" className="size-3.5" />
        </button>
      ) : null}
    </span>
  );
}

function MacroInput({
  label,
  value,
  error,
  onChange,
}: {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="min-w-0">
      <span className="block text-xs text-muted-foreground">{label}</span>
      <span className="relative mt-1 block">
        <Input
          aria-invalid={Boolean(error)}
          className="metric-number h-11 min-h-11 px-3 pr-8 text-base font-semibold"
          inputMode="decimal"
          onChange={(event) => onChange(event.target.value)}
          placeholder="0"
          value={value}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          g
        </span>
      </span>
    </label>
  );
}

export function FoodEntryForm({
  date,
  meal,
  entry,
  initialDraft,
  library,
  onDone,
}: FoodEntryFormProps) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<FoodDraft>(() =>
    entry ? draftFromEntry(entry) : (initialDraft ?? emptyFoodDraft()),
  );
  const [errors, setErrors] = useState<FoodErrors>({});
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: nutritionKeys.all });
  const failWith = (error: unknown) => setErrors({ form: errorMessage(error) });

  const saveMutation = useMutation({
    mutationFn: () =>
      entry
        ? updateFoodEntry(entry.id, toFoodUpdate(draft))
        : createFoodEntry(toFoodInput(draft, date, meal)),
    onSuccess: async () => {
      await refresh();
      onDone();
    },
    onError: failWith,
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteFoodEntry(entry?.id ?? ''),
    onSuccess: async () => {
      await refresh();
      onDone();
    },
    onError: (error) => {
      setIsConfirmingDelete(false);
      failWith(error);
    },
  });
  const removeFavorite = useMutation({
    mutationFn: (id: string) => deleteSavedFood(id),
    onSuccess: refresh,
  });

  const isBusy = saveMutation.isPending || deleteMutation.isPending;

  function update(field: keyof FoodDraft, value: string | boolean) {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({
      ...current,
      [field]: undefined,
      form: undefined,
    }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateFoodDraft(draft);
    setErrors(nextErrors);
    if (Object.values(nextErrors).every((message) => !message)) {
      saveMutation.mutate();
    }
  }

  const saved = library?.saved ?? [];
  const recent = (library?.recent ?? []).filter(
    (food) =>
      !saved.some(
        (favorite) =>
          favorite.name.toLocaleLowerCase('tr-TR') ===
          food.name.toLocaleLowerCase('tr-TR'),
      ),
  );

  return (
    <form className="space-y-4" noValidate onSubmit={submit}>
      {!entry && (saved.length > 0 || recent.length > 0) ? (
        <div className="space-y-3">
          {saved.length > 0 ? (
            <div>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Star aria-hidden="true" className="size-3.5" />
                Favoriler
              </p>
              <div className="-mx-1 mt-1.5 flex gap-2 overflow-x-auto px-1 pb-1">
                {saved.map((food) => (
                  <QuickPick
                    food={food}
                    key={food.id}
                    onPick={() => setDraft(draftFromFood(food))}
                    onRemove={() => removeFavorite.mutate(food.id)}
                  />
                ))}
              </div>
            </div>
          ) : null}
          {recent.length > 0 ? (
            <div>
              <p className="text-xs text-muted-foreground">Son yenenler</p>
              <div className="-mx-1 mt-1.5 flex gap-2 overflow-x-auto px-1 pb-1">
                {recent.map((food) => (
                  <QuickPick
                    food={food}
                    key={food.name}
                    onPick={() => setDraft(draftFromFood(food))}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <label className="block text-sm font-medium text-foreground">
        Yiyecek
        <Input
          aria-invalid={Boolean(errors.name)}
          className="mt-1.5"
          maxLength={120}
          onChange={(event) => update('name', event.target.value)}
          placeholder="Örneğin yulaf ezmesi"
          value={draft.name}
        />
        {errors.name ? (
          <span className="mt-1 block text-xs text-destructive" role="alert">
            {errors.name}
          </span>
        ) : null}
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block min-w-0 text-sm font-medium text-foreground">
          Porsiyon
          <Input
            aria-invalid={Boolean(errors.servingLabel)}
            className="mt-1.5"
            maxLength={60}
            onChange={(event) => update('servingLabel', event.target.value)}
            placeholder="150 g, 2 dilim"
            value={draft.servingLabel}
          />
        </label>
        <label className="block min-w-0 text-sm font-medium text-foreground">
          Kalori
          <span className="relative mt-1.5 block">
            <Input
              aria-invalid={Boolean(errors.calories)}
              className="metric-number pr-12 font-semibold"
              inputMode="numeric"
              onChange={(event) => update('calories', event.target.value)}
              placeholder={
                isCaloriesDerived(draft) ? String(draftCalories(draft)) : '0'
              }
              value={draft.calories}
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-normal text-muted-foreground">
              kcal
            </span>
          </span>
        </label>
      </div>
      {errors.calories ? (
        <p className="-mt-2 text-xs text-destructive" role="alert">
          {errors.calories}
        </p>
      ) : null}

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <MacroInput
          error={errors.proteinG}
          label="Protein"
          onChange={(value) => update('proteinG', value)}
          value={draft.proteinG}
        />
        <MacroInput
          error={errors.carbsG}
          label="Karbonhidrat"
          onChange={(value) => update('carbsG', value)}
          value={draft.carbsG}
        />
        <MacroInput
          error={errors.fatG}
          label="Yağ"
          onChange={(value) => update('fatG', value)}
          value={draft.fatG}
        />
      </div>
      {errors.proteinG || errors.carbsG || errors.fatG ? (
        <p className="-mt-2 text-xs text-destructive" role="alert">
          {errors.proteinG ?? errors.carbsG ?? errors.fatG}
        </p>
      ) : isCaloriesDerived(draft) ? (
        <p className="-mt-2 text-xs text-muted-foreground">
          Kalori makrolardan hesaplanacak:{' '}
          <span className="metric-number font-semibold text-foreground">
            {formatCalories(draftCalories(draft))} kcal
          </span>
        </p>
      ) : null}

      <label className="block text-sm font-medium text-foreground">
        Not
        <Input
          aria-invalid={Boolean(errors.note)}
          className="mt-1.5"
          maxLength={500}
          onChange={(event) => update('note', event.target.value)}
          placeholder="İsteğe bağlı"
          value={draft.note}
        />
      </label>

      {!entry ? (
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-foreground">
          <input
            checked={draft.saveAsFavorite}
            className="size-5 cursor-pointer accent-[var(--primary)]"
            onChange={(event) => update('saveAsFavorite', event.target.checked)}
            type="checkbox"
          />
          Favorilere ekle
        </label>
      ) : null}

      {errors.form ? (
        <p className="text-sm text-destructive" role="alert">
          {errors.form}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button disabled={isBusy} type="submit">
          {saveMutation.isPending ? 'Kaydediliyor…' : 'Kaydet'}
        </Button>
        <Button disabled={isBusy} onClick={onDone} variant="ghost">
          Vazgeç
        </Button>

        {entry ? (
          isConfirmingDelete ? (
            <span className="ml-auto flex items-center gap-2">
              <Button
                disabled={isBusy}
                onClick={() => deleteMutation.mutate()}
                variant="destructive"
              >
                {deleteMutation.isPending ? 'Siliniyor…' : 'Evet, sil'}
              </Button>
              <Button
                disabled={isBusy}
                onClick={() => setIsConfirmingDelete(false)}
                variant="ghost"
              >
                Vazgeç
              </Button>
            </span>
          ) : (
            <Button
              className="ml-auto text-destructive"
              disabled={isBusy}
              onClick={() => setIsConfirmingDelete(true)}
              variant="ghost"
            >
              <Trash2 aria-hidden="true" className="size-4" />
              Sil
            </Button>
          )
        ) : null}
      </div>
    </form>
  );
}
