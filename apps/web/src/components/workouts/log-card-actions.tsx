import { useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, MoreHorizontal, Pencil, Trash2, X } from 'lucide-react';

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
  /** Read-only view of the sets; hidden while the sets are being edited. */
  summary: ReactNode;
  /**
   * `menu` tucks the actions behind a "⋯" toggle for long lists; `inline`
   * shows them as buttons under the summary.
   */
  variant?: 'inline' | 'menu';
}

export function LogCardActions({
  log,
  exerciseSlug,
  isCustom,
  summary,
  variant = 'inline',
}: LogCardActionsProps) {
  const queryClient = useQueryClient();
  const editor = useWorkoutSets(log.sets);
  const [mode, setMode] = useState<Mode>('idle');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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
    setIsMenuOpen(false);
    setMode(nextMode);
  }

  function submitUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const sets = editor.validatedInput();
    if (sets) updateMutation.mutate(sets);
  }

  const actionButtons = (
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
  );

  return (
    <div>
      {mode !== 'edit' && variant === 'menu' ? (
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">{summary}</div>
          <Button
            aria-expanded={isMenuOpen}
            aria-label="Kayıt işlemleri"
            className="-mr-2 -mt-1.5 size-11 min-h-11 text-muted-foreground"
            disabled={mode === 'delete'}
            onClick={() => setIsMenuOpen((current) => !current)}
            size="icon"
            variant="ghost"
          >
            <MoreHorizontal aria-hidden="true" className="size-5" />
          </Button>
        </div>
      ) : null}
      {mode !== 'edit' && variant === 'inline' ? summary : null}

      {mode === 'idle' && variant === 'menu' && isMenuOpen ? (
        <div className="mt-3">{actionButtons}</div>
      ) : null}
      {mode === 'idle' && variant === 'inline' ? (
        <div className="mt-4 border-t border-border pt-3">{actionButtons}</div>
      ) : null}

      {mode === 'edit' ? (
        <form className="mt-3" noValidate onSubmit={submitUpdate}>
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
          className="mt-3 rounded-md border border-destructive/30 bg-destructive/8 p-3"
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
