import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Save } from 'lucide-react';

import { createExerciseLog, exerciseKeys } from '@/api/exercises';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { invalidateWorkoutQueries } from '@/lib/workout-queries';
import type { ExerciseLog, ExerciseSetInput } from '@/types/exercise';
import { RestTimer } from './rest-timer';
import { SetEditor } from './set-editor';
import { useWorkoutSets } from './use-workout-sets';

interface WorkoutEntrySectionProps {
  exerciseSlug: string;
  isCustom: boolean;
  recentLog?: ExerciseLog;
}

function getSaveErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 400) {
    return 'Set bilgilerini kontrol edip tekrar dene.';
  }
  return 'Antrenman kaydedilemedi. Bağlantını kontrol edip tekrar dene.';
}

function lastWorkoutHint(log: ExerciseLog): string {
  const firstWeight = log.sets[0]?.weightKg;
  if (log.sets.every((set) => set.weightKg === firstWeight)) {
    return `${firstWeight} kg × ${log.sets.map((set) => set.reps).join(', ')}`;
  }
  return log.sets.map((set) => `${set.weightKg} kg × ${set.reps}`).join(' · ');
}

export function WorkoutEntrySection({
  exerciseSlug,
  isCustom,
  recentLog,
}: WorkoutEntrySectionProps) {
  const queryClient = useQueryClient();
  const editor = useWorkoutSets();
  const isDirty = useRef(false);
  const [isComplete, setIsComplete] = useState(false);
  const [savedLogId, setSavedLogId] = useState<string | null>(null);

  useEffect(() => {
    if (!isDirty.current) {
      editor.reset(recentLog?.sets);
    }
    // A new recent log should update an untouched entry form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentLog]);

  const mutation = useMutation({
    mutationFn: (sets: ExerciseSetInput[]) =>
      createExerciseLog(exerciseSlug, sets, isCustom),
    onSuccess: async (savedLog) => {
      if ('vibrate' in navigator) {
        navigator.vibrate(12);
      }
      editor.reset(savedLog.sets);
      isDirty.current = false;
      queryClient.setQueryData<ExerciseLog[]>(
        exerciseKeys.logs(exerciseSlug, isCustom),
        (current) => [savedLog, ...(current ?? [])].slice(0, 5),
      );
      setSavedLogId(savedLog.id);
      setIsComplete(true);
      await invalidateWorkoutQueries(queryClient, exerciseSlug, isCustom);
    },
  });

  function markChanged() {
    isDirty.current = true;
    setIsComplete(false);
    mutation.reset();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsComplete(false);
    const input = editor.validatedInput();
    if (input) {
      mutation.mutate(input);
    }
  }

  return (
    <>
      <section className="mt-6 rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-base font-semibold text-foreground">
          Bugünkü setler
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Ağırlık ve tekrarlarını set set gir, sonra kaydet.
        </p>
        {recentLog ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <p>
              Geçen sefer:{' '}
              <span className="font-mono tabular-nums text-foreground">
                {lastWorkoutHint(recentLog)}
              </span>
            </p>
            <button
              className="min-h-11 rounded-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
              disabled={mutation.isPending}
              onClick={() => {
                editor.reset();
                markChanged();
              }}
              type="button"
            >
              Temizle
            </button>
          </div>
        ) : null}

        <form className="mt-5" noValidate onSubmit={handleSubmit}>
          <SetEditor
            disabled={mutation.isPending}
            editor={editor}
            onChange={markChanged}
          />
          {mutation.isError ? (
            <p
              aria-live="polite"
              className="mt-4 text-sm text-destructive"
              role="alert"
            >
              {getSaveErrorMessage(mutation.error)}
            </p>
          ) : null}
          {isComplete ? (
            <div
              aria-live="polite"
              className="mt-4 flex items-start gap-3 rounded-md border border-success/25 bg-success/8 p-3.5 text-success"
              role="status"
            >
              <CheckCircle2
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0"
              />
              <div>
                <p className="text-sm font-semibold">Antrenman kaydedildi</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Gelişim verilerin güncellendi.
                </p>
              </div>
            </div>
          ) : null}
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
      </section>
      {savedLogId ? <RestTimer key={savedLogId} /> : null}
    </>
  );
}
