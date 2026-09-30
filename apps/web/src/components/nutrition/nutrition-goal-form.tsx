import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';

import {
  clearNutritionGoal,
  nutritionKeys,
  setNutritionGoal,
} from '@/api/nutrition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  goalDraftFrom,
  toGoalInput,
  validateGoalDraft,
  type GoalDraft,
  type GoalErrors,
} from '@/lib/nutrition';
import type { NutritionGoal } from '@/types/nutrition';

interface NutritionGoalFormProps {
  goal: NutritionGoal | null;
  onDone: () => void;
}

const fields: readonly [keyof GoalDraft, string, string][] = [
  ['calories', 'Kalori', 'kcal'],
  ['proteinG', 'Protein', 'g'],
  ['carbsG', 'Karbonhidrat', 'g'],
  ['fatG', 'Yağ', 'g'],
];

export function NutritionGoalForm({ goal, onDone }: NutritionGoalFormProps) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<GoalDraft>(() => goalDraftFrom(goal));
  const [errors, setErrors] = useState<GoalErrors & { form?: string }>({});

  const finish = async () => {
    await queryClient.invalidateQueries({ queryKey: nutritionKeys.all });
    onDone();
  };
  const onError = () =>
    setErrors({ form: 'Hedef kaydedilemedi. Yeniden deneyebilirsin.' });

  const saveMutation = useMutation({
    mutationFn: () => setNutritionGoal(toGoalInput(draft)),
    onSuccess: finish,
    onError,
  });
  const clearMutation = useMutation({
    mutationFn: clearNutritionGoal,
    onSuccess: finish,
    onError,
  });
  const isBusy = saveMutation.isPending || clearMutation.isPending;

  function update(field: keyof GoalDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({
      ...current,
      [field]: undefined,
      form: undefined,
    }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateGoalDraft(draft);
    setErrors(nextErrors);
    if (Object.values(nextErrors).every((message) => !message)) {
      saveMutation.mutate();
    }
  }

  const fieldError = fields
    .map(([field]) => errors[field])
    .find((message) => message);

  return (
    <form
      aria-label="Günlük hedef"
      className="animate-rise rounded-lg border border-border bg-surface p-4 sm:p-5"
      noValidate
      onSubmit={submit}
    >
      <h2 className="text-base font-semibold text-foreground">Günlük hedef</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Kalori hedefi zorunlu. Makro hedeflerini boş bırakırsan yalnızca aldığın
        miktar gösterilir.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {fields.map(([field, label, unit]) => (
          <label className="min-w-0" key={field}>
            <span className="block text-xs text-muted-foreground">{label}</span>
            <span className="relative mt-1 block">
              <Input
                aria-invalid={Boolean(errors[field])}
                className="metric-number h-11 min-h-11 px-3 pr-11 text-base font-semibold"
                inputMode="numeric"
                onChange={(event) => update(field, event.target.value)}
                placeholder={field === 'calories' ? '2200' : '0'}
                value={draft[field]}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {unit}
              </span>
            </span>
          </label>
        ))}
      </div>

      {fieldError || errors.form ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {fieldError ?? errors.form}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button disabled={isBusy} type="submit">
          {saveMutation.isPending ? 'Kaydediliyor…' : 'Hedefi kaydet'}
        </Button>
        <Button disabled={isBusy} onClick={onDone} variant="ghost">
          Vazgeç
        </Button>
        {goal ? (
          <Button
            className="ml-auto"
            disabled={isBusy}
            onClick={() => clearMutation.mutate()}
            variant="ghost"
          >
            {clearMutation.isPending ? 'Kaldırılıyor…' : 'Hedefi kaldır'}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
