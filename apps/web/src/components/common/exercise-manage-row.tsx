import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { deleteExercise, renameExercise } from '@/api/exercises';
import { muscleGroupKeys } from '@/api/muscle-groups';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api';
import type { ExerciseSummary } from '@/types/exercise';

interface ExerciseManageRowProps {
  exercise: ExerciseSummary;
  /** Position in the list, used for the entry cascade. */
  index?: number;
}

type RowMode = 'idle' | 'rename' | 'delete';

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError && error.status !== 500
    ? error.message
    : fallback;
}

export function ExerciseManageRow({
  exercise,
  index = 0,
}: ExerciseManageRowProps) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<RowMode>('idle');
  const [name, setName] = useState(exercise.name);
  const [formError, setFormError] = useState<string | null>(null);
  const inputId = `exercise-name-${exercise.id}`;
  const errorId = `${inputId}-error`;

  // Names appear in the library, history, and reports; counts on the groups.
  const refreshExerciseData = () =>
    Promise.all(
      [['exercises'], muscleGroupKeys.all, ['reports'], ['history']].map(
        (queryKey) => queryClient.invalidateQueries({ queryKey }),
      ),
    );

  const renameMutation = useMutation({
    mutationFn: (nextName: string) => renameExercise(exercise, nextName),
    onSuccess: async () => {
      await refreshExerciseData();
      setMode('idle');
    },
    onError: (error) =>
      setFormError(
        errorMessage(error, 'İsim kaydedilemedi. Yeniden deneyebilirsin.'),
      ),
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteExercise(exercise),
    onSuccess: refreshExerciseData,
    onError: (error) =>
      setFormError(
        errorMessage(error, 'Hareket silinemedi. Yeniden deneyebilirsin.'),
      ),
  });

  function openMode(nextMode: RowMode) {
    setFormError(null);
    setName(exercise.name);
    setMode(nextMode);
  }

  function submitRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = name.trim().replace(/\s+/g, ' ');

    if (nextName.length < 2 || nextName.length > 120) {
      setFormError('Hareket adı 2 ile 120 karakter arasında olmalı.');
      return;
    }
    if (nextName === exercise.name) {
      setMode('idle');
      return;
    }

    setFormError(null);
    renameMutation.mutate(nextName);
  }

  return (
    <div
      className="animate-rise rounded-lg border border-border bg-surface p-3 sm:p-4"
      style={{ '--i': index }}
    >
      {mode === 'rename' ? (
        <form noValidate onSubmit={submitRename}>
          <label
            className="text-sm font-medium text-foreground"
            htmlFor={inputId}
          >
            Yeni hareket adı
          </label>
          <Input
            aria-describedby={formError ? errorId : undefined}
            aria-invalid={formError ? true : undefined}
            autoComplete="off"
            autoFocus
            className="mt-2"
            id={inputId}
            maxLength={120}
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
          {formError ? (
            <p
              className="mt-2 text-sm font-medium text-destructive"
              id={errorId}
            >
              {formError}
            </p>
          ) : null}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              disabled={renameMutation.isPending}
              onClick={() => setMode('idle')}
              variant="secondary"
            >
              <X aria-hidden="true" className="size-4" />
              Vazgeç
            </Button>
            <Button disabled={renameMutation.isPending} type="submit">
              <Check aria-hidden="true" className="size-4" />
              {renameMutation.isPending ? 'Kaydediliyor' : 'Kaydet'}
            </Button>
          </div>
        </form>
      ) : (
        <>
          <div className="flex min-w-0 items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="flex min-w-0 items-center gap-2">
                <span className="truncate text-[0.9375rem] font-semibold text-foreground">
                  {exercise.name}
                </span>
                {exercise.isCustom ? (
                  <span className="shrink-0 rounded-sm bg-primary/12 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-primary">
                    Özel
                  </span>
                ) : null}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {exercise.equipment ?? 'Ekipmansız'}
              </p>
            </div>
            {mode === 'idle' ? (
              <>
                <Button
                  aria-label={`${exercise.name} adını değiştir`}
                  onClick={() => openMode('rename')}
                  size="icon"
                  variant="secondary"
                >
                  <Pencil aria-hidden="true" className="size-4" />
                </Button>
                <Button
                  aria-label={`${exercise.name} hareketini sil`}
                  className="text-destructive hover:border-destructive/40"
                  onClick={() => openMode('delete')}
                  size="icon"
                  variant="secondary"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </Button>
              </>
            ) : null}
          </div>

          {mode === 'delete' ? (
            <div
              aria-live="polite"
              className="mt-3 rounded-md border border-destructive/30 bg-destructive/8 p-3"
            >
              <p className="text-sm font-semibold text-foreground">
                Bu hareket kütüphanenden kaldırılsın mı?
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Geçmiş antrenman kayıtların ve raporların korunur.
              </p>
              {formError ? (
                <p className="mt-2 text-sm font-medium text-destructive">
                  {formError}
                </p>
              ) : null}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button
                  disabled={deleteMutation.isPending}
                  onClick={() => setMode('idle')}
                  variant="secondary"
                >
                  Vazgeç
                </Button>
                <Button
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate()}
                  variant="destructive"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                  {deleteMutation.isPending ? 'Siliniyor' : 'Sil'}
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
