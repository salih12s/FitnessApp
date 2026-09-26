import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Dumbbell, Save } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';

import { createCustomExercise } from '@/api/exercises';
import { getMuscleGroups, muscleGroupKeys } from '@/api/muscle-groups';
import { FeedbackPanel } from '@/components/common/feedback-panel';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api';
import { exercisePath } from '@/lib/exercise-path';
import {
  isCustomExerciseFormComplete,
  normalizeCustomExerciseForm,
} from '@/lib/custom-exercise-form';

export function CustomExercisePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const muscleGroupsQuery = useQuery({
    queryKey: muscleGroupKeys.all,
    queryFn: getMuscleGroups,
  });
  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('');
  const [equipment, setEquipment] = useState('');
  const [instructions, setInstructions] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () =>
      createCustomExercise(
        normalizeCustomExerciseForm({
          name,
          muscleGroup,
          equipment,
          instructions,
        }),
      ),
    onSuccess: async (exercise) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['exercises'] }),
        queryClient.invalidateQueries({ queryKey: muscleGroupKeys.all }),
      ]);
      navigate(exercisePath(exercise), { replace: true });
    },
    onError: (error) =>
      setFormError(
        error instanceof ApiError
          ? error.message
          : 'Özel hareket oluşturulamadı. Yeniden deneyebilirsin.',
      ),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (
      !isCustomExerciseFormComplete({
        name,
        muscleGroup,
        equipment,
        instructions,
      })
    ) {
      setFormError('Hareket adı, kas grubu ve ekipman gerekli.');
      return;
    }

    mutation.mutate();
  }

  return (
    <div>
      <Link
        className="inline-flex -ml-1 min-h-11 items-center gap-1.5 rounded-md px-1 text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring"
        to="/app"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Ana sayfaya dön
      </Link>
      <PageHeader
        className="mt-6"
        description="Kütüphanede olmayan bir hareketi yalnızca kendi hesabın için ekle."
        title="Özel hareket ekle"
      />

      {muscleGroupsQuery.isError ? (
        <div className="mt-8">
          <FeedbackPanel
            actionLabel="Tekrar dene"
            description="Kas grupları alınamadı. Formu tamamlamak için yeniden deneyebilirsin."
            icon={Dumbbell}
            isActionPending={muscleGroupsQuery.isFetching}
            onAction={() => void muscleGroupsQuery.refetch()}
            title="Kas grupları yüklenemedi"
          />
        </div>
      ) : null}

      <form
        className="mt-6 max-w-xl space-y-5 rounded-lg border border-border bg-surface p-4 sm:p-6"
        onSubmit={submit}
      >
        <div>
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="custom-exercise-name"
          >
            Hareket adı
          </label>
          <Input
            autoComplete="off"
            className="mt-2"
            id="custom-exercise-name"
            maxLength={120}
            onChange={(event) => setName(event.target.value)}
            placeholder="Örn. Tek Kol Kablo Row"
            value={name}
          />
        </div>
        <div>
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="custom-exercise-muscle-group"
          >
            Kas grubu
          </label>
          <select
            className="mt-2 min-h-12 w-full cursor-pointer rounded-md border border-border-strong bg-surface px-4 py-3 text-base text-foreground outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring sm:text-sm"
            disabled={muscleGroupsQuery.isPending}
            id="custom-exercise-muscle-group"
            onChange={(event) => setMuscleGroup(event.target.value)}
            value={muscleGroup}
          >
            <option value="">Kas grubu seç</option>
            {(muscleGroupsQuery.data ?? []).map((group) => (
              <option key={group.id} value={group.slug}>
                {group.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="custom-exercise-equipment"
          >
            Ekipman
          </label>
          <Input
            autoComplete="off"
            className="mt-2"
            id="custom-exercise-equipment"
            maxLength={100}
            onChange={(event) => setEquipment(event.target.value)}
            placeholder="Örn. Kablo"
            value={equipment}
          />
        </div>
        <div>
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="custom-exercise-instructions"
          >
            Açıklama{' '}
            <span className="font-normal text-muted-foreground">
              (isteğe bağlı)
            </span>
          </label>
          <textarea
            className="mt-2 min-h-32 w-full rounded-md border border-border-strong bg-surface px-4 py-3 text-base text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring sm:text-sm"
            id="custom-exercise-instructions"
            maxLength={1000}
            onChange={(event) => setInstructions(event.target.value)}
            placeholder="Hareketi uygularken dikkat etmek istediğin noktalar."
            value={instructions}
          />
        </div>
        {formError ? (
          <p className="text-sm font-semibold text-destructive" role="alert">
            {formError}
          </p>
        ) : null}
        <Button
          className="w-full sm:w-auto"
          disabled={mutation.isPending || muscleGroupsQuery.isPending}
          size="lg"
          type="submit"
        >
          <Save aria-hidden="true" className="size-4" />
          {mutation.isPending ? 'Kaydediliyor…' : 'Hareketi kaydet'}
        </Button>
      </form>
    </div>
  );
}
