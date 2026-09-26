import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Pencil, Trash2, X } from 'lucide-react';

import { deleteExerciseLog, updateExerciseLog } from '@/api/exercises';
import { Button } from '@/components/ui/button';
import { invalidateWorkoutQueries } from '@/lib/workout-queries';
import type { ExerciseLog, ExerciseSetInput } from '@/types/exercise';
import { SetEditor } from './set-editor';
import { useWorkoutSets } from './use-workout-sets';

type Mode = 'idle' | 'edit' | 'delete';

interface LogCardActionsProps {
  log: ExerciseLog;
  exerciseSlug: string;
  isCustom: boolean;
}

export function LogCardActions({
  log,
  exerciseSlug,
  isCustom,
}: LogCardActionsProps) {
  const queryClient = useQueryClient();
  const editor = useWorkoutSets(log.sets);
  const [mode, setMode] = useState<Mode>('idle');
  const refresh = () =>
    invalidateWorkoutQueries(queryClient, exerciseSlug, isCustom);
  const updateMutation = useMutation({
    mutationFn: (sets: ExerciseSetInput[]) => updateExerciseLog(log.id, sets),
    onSuccess: async (updated) => {
      editor.reset(updated.sets);
      await refresh();
      setMode('idle');
    },
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteExerciseLog(log.id),
    onSuccess: async () => {
      await refresh();
      setMode('idle');
    },
  });

  function open(nextMode: Mode) {
    editor.reset(log.sets);
    updateMutation.reset();
    deleteMutation.reset();
    setMode(nextMode);
  }

  function submitUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const sets = editor.validatedInput();
    if (sets) updateMutation.mutate(sets);
  }

  return (
    <div className="mt-4 border-t border-border pt-3">
      {mode === 'idle' ? (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => open('edit')} variant="secondary">
            <Pencil aria-hidden="true" className="size-4" />
            Düzenle
          </Button>
          <Button
            className="text-destructive hover:border-destructive/40"
            onClick={() => open('delete')}
            variant="secondary"
          >
            <Trash2 aria-hidden="true" className="size-4" />
            Sil
          </Button>
        </div>
      ) : null}

      {mode === 'edit' ? (
        <form noValidate onSubmit={submitUpdate}>
          <p className="mb-3 text-sm font-semibold text-foreground">
            Setleri düzenle
          </p>
          <SetEditor
            disabled={updateMutation.isPending}
            editor={editor}
            onChange={() => updateMutation.reset()}
          />
          {updateMutation.isError ? (
            <p className="mt-3 text-sm text-destructive" role="alert">
              Değişiklikler kaydedilemedi. Bağlantını kontrol edip tekrar dene.
            </p>
          ) : null}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              disabled={updateMutation.isPending}
              onClick={() => open('idle')}
              type="button"
              variant="secondary"
            >
              <X aria-hidden="true" className="size-4" />
              Vazgeç
            </Button>
            <Button disabled={updateMutation.isPending} type="submit">
              <Check aria-hidden="true" className="size-4" />
              {updateMutation.isPending ? 'Kaydediliyor' : 'Kaydet'}
            </Button>
          </div>
        </form>
      ) : null}

      {mode === 'delete' ? (
        <div
          aria-live="polite"
          className="rounded-md border border-destructive/30 bg-destructive/8 p-3"
        >
          <p className="text-sm font-semibold text-foreground">
            Bu antrenman kaydı silinsin mi?
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Setler ve bu kayda ait rapor verileri silinir.
          </p>
          {deleteMutation.isError ? (
            <p className="mt-2 text-sm text-destructive" role="alert">
              Kayıt silinemedi. Bağlantını kontrol edip tekrar dene.
            </p>
          ) : null}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              disabled={deleteMutation.isPending}
              onClick={() => open('idle')}
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
    </div>
  );
}
