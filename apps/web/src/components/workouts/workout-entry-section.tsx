import { useRef, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Plus, Save, Trash2 } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';

import { createExerciseLog, exerciseKeys } from '@/api/exercises';
import { reportKeys } from '@/api/reports';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api';
import {
  validateWorkoutSets,
  type WorkoutSetDraft,
  type WorkoutSetErrors,
} from '@/lib/workout-validation';

interface WorkoutEntrySectionProps {
  exerciseSlug: string;
  isCustom: boolean;
}

interface EditableSet extends WorkoutSetDraft {
  id: number;
}

function createEmptySet(id: number): EditableSet {
  return { id, weightKg: '', reps: '' };
}

function getSaveErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 400) {
      return 'Set bilgilerini kontrol edip tekrar dene.';
    }

    return error.message;
  }

  return 'Antrenman kaydedilemedi. Bağlantını kontrol edip tekrar dene.';
}

export function WorkoutEntrySection({
  exerciseSlug,
  isCustom,
}: WorkoutEntrySectionProps) {
  const nextSetId = useRef(2);
  const queryClient = useQueryClient();
  const [sets, setSets] = useState<EditableSet[]>([createEmptySet(1)]);
  const [errors, setErrors] = useState<Record<number, WorkoutSetErrors>>({});
  const [isComplete, setIsComplete] = useState(false);
  const mutation = useMutation({
    mutationFn: () =>
      createExerciseLog(
        exerciseSlug,
        sets.map((set) => ({
          weightKg: set.weightKg.trim(),
          reps: Number(set.reps),
        })),
        isCustom,
      ),
    onSuccess: async () => {
      // A short pulse confirms the save on devices that support vibration.
      if ('vibrate' in navigator) {
        navigator.vibrate(12);
      }
      setSets([createEmptySet(nextSetId.current++)]);
      setErrors({});
      setIsComplete(true);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: exerciseKeys.logs(exerciseSlug, isCustom),
        }),
        queryClient.invalidateQueries({ queryKey: ['history'] }),
        queryClient.invalidateQueries({ queryKey: reportKeys.exercises }),
        queryClient.invalidateQueries({ queryKey: ['reports', 'detail'] }),
      ]);
    },
  });

  function updateSet(id: number, field: 'weightKg' | 'reps', value: string) {
    setSets((currentSets) =>
      currentSets.map((set) =>
        set.id === id ? { ...set, [field]: value } : set,
      ),
    );
    setErrors((currentErrors) => {
      if (!currentErrors[id]?.[field]) {
        return currentErrors;
      }

      return {
        ...currentErrors,
        [id]: { ...currentErrors[id], [field]: undefined },
      };
    });
    setIsComplete(false);
    mutation.reset();
  }

  function addSet() {
    setSets((currentSets) => [
      ...currentSets,
      createEmptySet(nextSetId.current++),
    ]);
    setIsComplete(false);
    mutation.reset();
  }

  function removeSet(id: number) {
    setSets((currentSets) => currentSets.filter((set) => set.id !== id));
    setErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      delete nextErrors[id];
      return nextErrors;
    });
    setIsComplete(false);
    mutation.reset();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateWorkoutSets(sets);

    setErrors(nextErrors);
    setIsComplete(false);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    mutation.mutate();
  }

  return (
    <section className="mt-6 rounded-lg border border-border bg-surface p-4 sm:p-5">
      <div>
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Bugünkü setler
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Ağırlık ve tekrarlarını set set gir, sonra kaydet.
          </p>
        </div>

        <form className="mt-5" noValidate onSubmit={handleSubmit}>
          <div className="grid grid-cols-[2rem_minmax(0,1.1fr)_minmax(0,0.9fr)_2.75rem] items-end gap-2 text-xs text-muted-foreground">
            <span className="text-center">Set</span>
            <span>Ağırlık</span>
            <span>Tekrar</span>
            <span className="sr-only">Set işlemi</span>
          </div>

          <ol className="mt-2 flex flex-col gap-2">
            <AnimatePresence initial={false} mode="popLayout">
              {sets.map((set, index) => {
                const setErrors = errors[set.id];
                const hasErrors = Boolean(
                  setErrors?.weightKg || setErrors?.reps,
                );

                return (
                  <m.li
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="rounded-md"
                    exit={{
                      opacity: 0,
                      x: -24,
                      transition: { duration: 0.18 },
                    }}
                    initial={{ opacity: 0, y: -10, scale: 0.98 }}
                    key={set.id}
                    layout
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  >
                    <div className="grid grid-cols-[2rem_minmax(0,1.1fr)_minmax(0,0.9fr)_2.75rem] items-center gap-2">
                      <span className="metric-number text-center text-sm text-muted-foreground">
                        {index + 1}
                      </span>
                      <label className="relative min-w-0">
                        <span className="sr-only">Set {index + 1} ağırlık</span>
                        <Input
                          aria-invalid={Boolean(setErrors?.weightKg)}
                          className="metric-number h-12 min-w-0 px-3 pr-9 text-lg font-semibold sm:text-lg"
                          disabled={mutation.isPending}
                          inputMode="decimal"
                          max="9999.99"
                          min="0"
                          onChange={(event) =>
                            updateSet(set.id, 'weightKg', event.target.value)
                          }
                          placeholder="0"
                          required
                          step="0.01"
                          type="number"
                          value={set.weightKg}
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          kg
                        </span>
                      </label>
                      <label className="relative min-w-0">
                        <span className="sr-only">Set {index + 1} tekrar</span>
                        <Input
                          aria-invalid={Boolean(setErrors?.reps)}
                          className="metric-number h-12 min-w-0 px-3 pr-14 text-lg font-semibold sm:text-lg"
                          disabled={mutation.isPending}
                          inputMode="numeric"
                          max="1000"
                          min="1"
                          onChange={(event) =>
                            updateSet(set.id, 'reps', event.target.value)
                          }
                          placeholder="0"
                          required
                          step="1"
                          type="number"
                          value={set.reps}
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          tekrar
                        </span>
                      </label>
                      <Button
                        aria-label={`Set ${index + 1}'i kaldır`}
                        className="size-11 min-h-11 text-muted-foreground hover:text-destructive"
                        disabled={sets.length === 1 || mutation.isPending}
                        onClick={() => removeSet(set.id)}
                        size="icon"
                        variant="ghost"
                      >
                        <Trash2 aria-hidden="true" className="size-4" />
                      </Button>
                    </div>
                    {hasErrors ? (
                      <p
                        className="mt-1.5 pl-10 text-xs leading-5 text-destructive"
                        role="alert"
                      >
                        {setErrors?.weightKg ?? setErrors?.reps}
                      </p>
                    ) : null}
                  </m.li>
                );
              })}
            </AnimatePresence>
          </ol>

          <Button
            className="mt-3 w-full border-dashed"
            disabled={sets.length >= 50 || mutation.isPending}
            onClick={addSet}
            variant="secondary"
          >
            <Plus aria-hidden="true" className="size-4" />
            Set ekle
          </Button>

          {mutation.isError ? (
            <p
              aria-live="polite"
              className="mt-4 text-sm leading-6 text-destructive"
              role="alert"
            >
              {getSaveErrorMessage(mutation.error)}
            </p>
          ) : null}

          <AnimatePresence>
            {isComplete ? (
              <m.div
                animate={{ opacity: 1, y: 0, scale: 1 }}
                aria-live="polite"
                className="mt-4 flex items-start gap-3 rounded-md border border-success/25 bg-success/8 p-3.5 text-success"
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                role="status"
                transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              >
                <m.span
                  animate={{ scale: 1, rotate: 0 }}
                  className="mt-0.5 shrink-0"
                  initial={{ scale: 0.3, rotate: -45 }}
                  transition={{
                    type: 'spring',
                    stiffness: 500,
                    damping: 18,
                    delay: 0.08,
                  }}
                >
                  <CheckCircle2 aria-hidden="true" className="size-5" />
                </m.span>
                <div>
                  <p className="text-sm font-semibold">Antrenman kaydedildi</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Gelişim verilerin güncellendi.
                  </p>
                </div>
              </m.div>
            ) : null}
          </AnimatePresence>

          <Button
            className="mt-4 w-full"
            disabled={mutation.isPending}
            size="lg"
            type="submit"
          >
            <Save aria-hidden="true" className="size-4" />
            {mutation.isPending ? 'Kaydediliyor…' : 'Antrenmanı kaydet'}
          </Button>
        </form>
      </div>
    </section>
  );
}
