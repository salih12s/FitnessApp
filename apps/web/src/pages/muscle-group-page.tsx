import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Dumbbell,
  Pencil,
  SearchX,
} from 'lucide-react';
import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';

import { exerciseKeys, getExercisesByMuscleGroup } from '@/api/exercises';
import { getMuscleGroup, muscleGroupKeys } from '@/api/muscle-groups';
import { getReportExercises, reportKeys } from '@/api/reports';
import { ExerciseListItem } from '@/components/common/exercise-list-item';
import { ExerciseManageRow } from '@/components/common/exercise-manage-row';
import { FeedbackPanel } from '@/components/common/feedback-panel';
import { MuscleArtwork } from '@/components/common/muscle-artwork';
import { PageHeader } from '@/components/common/page-header';
import { SectionHeading } from '@/components/common/section-heading';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';

function ExerciseListLoading() {
  return (
    <div
      aria-label="Hareketler yükleniyor"
      className="grid gap-2 md:grid-cols-2"
      role="status"
    >
      {Array.from({ length: 6 }, (_, index) => (
        <div
          aria-hidden="true"
          className="skeleton h-18 rounded-lg border border-border"
          key={index}
        />
      ))}
    </div>
  );
}

export function MuscleGroupPage() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [isEditing, setIsEditing] = useState(false);
  const muscleGroupQuery = useQuery({
    queryKey: muscleGroupKeys.detail(slug ?? ''),
    queryFn: () => getMuscleGroup(slug ?? ''),
    enabled: Boolean(slug),
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.status === 404) && failureCount < 2,
  });
  const exercisesQuery = useQuery({
    queryKey: exerciseKeys.byMuscleGroup(slug ?? ''),
    queryFn: () => getExercisesByMuscleGroup(slug ?? ''),
    enabled: Boolean(slug && muscleGroupQuery.isSuccess),
    retry: 1,
  });
  const reportExercisesQuery = useQuery({
    queryKey: reportKeys.exercises,
    queryFn: getReportExercises,
    retry: 1,
  });

  if (!slug) {
    return <Navigate replace to="/app" />;
  }

  if (
    muscleGroupQuery.error instanceof ApiError &&
    muscleGroupQuery.error.status === 404
  ) {
    return <Navigate replace to="/app" />;
  }

  const muscleGroup = muscleGroupQuery.data;
  const exercises = exercisesQuery.data ?? [];
  const lastPerformedByExercise = new Map(
    (reportExercisesQuery.data ?? []).map((exercise) => [
      exercise.id,
      exercise.latestPerformedAt,
    ]),
  );

  return (
    <div>
      <button
        className="group inline-flex -ml-1 min-h-11 cursor-pointer items-center gap-1.5 rounded-md px-1 text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring"
        onClick={() => navigate('/app')}
        type="button"
      >
        <ArrowLeft
          aria-hidden="true"
          className="size-4 transition-transform group-hover:-translate-x-0.5"
        />
        Kas gruplarına dön
      </button>

      {muscleGroupQuery.isPending ? (
        <>
          <PageHeader
            className="mt-6"
            description="Kas grubu bilgileri sunucudan alınıyor."
            title="Yükleniyor…"
          />
          <div className="mt-8" role="status">
            <FeedbackPanel
              description="Bu işlem yalnızca kısa bir süre almalı."
              icon={Dumbbell}
              title="Kas grubu yükleniyor"
            />
          </div>
        </>
      ) : null}

      {muscleGroupQuery.isError ? (
        <>
          <PageHeader
            className="mt-6"
            description="Kas grubu bilgisine şu anda ulaşılamıyor."
            title="Bir sorun oluştu"
          />
          <div className="mt-8">
            <FeedbackPanel
              actionLabel="Tekrar dene"
              description="Sunucuya yeniden bağlanmayı deneyebilirsin."
              icon={AlertTriangle}
              isActionPending={muscleGroupQuery.isFetching}
              onAction={() => void muscleGroupQuery.refetch()}
              title="Kas grubu yüklenemedi"
            />
          </div>
        </>
      ) : null}

      {muscleGroup ? (
        <>
          <header className="relative mt-4 flex min-h-44 items-end overflow-hidden rounded-lg border border-border bg-surface p-5 sm:min-h-52 sm:p-7">
            <div className="relative z-10 max-w-[60%] sm:max-w-md">
              <h1 className="animate-rise text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
                {muscleGroup.name}
              </h1>
              <p
                className="animate-rise mt-1.5 text-sm text-muted-foreground"
                style={{ '--i': 1 }}
              >
                <span className="font-mono tabular-nums">
                  {muscleGroup.exerciseCount}
                </span>{' '}
                hareket arasından antrenmanına uygun olanı seç.
              </p>
            </div>
            <MuscleArtwork
              className="animate-rise absolute -right-4 top-2 h-52 w-44 sm:right-6 sm:h-64 sm:w-56"
              slug={muscleGroup.slug}
            />
          </header>

          <section aria-labelledby="exercise-list-title" className="mt-6">
            <div className="flex items-end justify-between gap-3">
              <SectionHeading
                className="min-w-0 flex-1"
                description={
                  isEditing
                    ? 'Hareketlerin adını değiştir veya kütüphanenden kaldır.'
                    : undefined
                }
                id="exercise-list-title"
                meta={
                  exercisesQuery.isPending
                    ? 'Yükleniyor'
                    : `${exercises.length} hareket`
                }
                title="Hareketler"
              />
              {exercises.length > 0 ? (
                <Button
                  aria-pressed={isEditing}
                  className="shrink-0"
                  onClick={() => setIsEditing((current) => !current)}
                  variant={isEditing ? 'primary' : 'secondary'}
                >
                  {isEditing ? (
                    <Check aria-hidden="true" className="size-4" />
                  ) : (
                    <Pencil aria-hidden="true" className="size-4" />
                  )}
                  {isEditing ? 'Bitti' : 'Düzenle'}
                </Button>
              ) : null}
            </div>

            <div className="mt-4">
              {exercisesQuery.isPending ? <ExerciseListLoading /> : null}

              {exercisesQuery.isError ? (
                <FeedbackPanel
                  actionLabel="Tekrar dene"
                  description="Bu kas grubuna ait hareketler alınamadı. Yeniden deneyebilirsin."
                  icon={AlertTriangle}
                  isActionPending={exercisesQuery.isFetching}
                  onAction={() => void exercisesQuery.refetch()}
                  title="Hareketler yüklenemedi"
                />
              ) : null}

              {exercisesQuery.isSuccess && exercises.length === 0 ? (
                <FeedbackPanel
                  description="Bu kas grubuna henüz bir hareket eklenmemiş."
                  icon={SearchX}
                  title="Hareket bulunamadı"
                />
              ) : null}

              {exercises.length > 0 ? (
                <div className="grid gap-2 md:grid-cols-2">
                  {exercises.map((exercise, index) =>
                    isEditing ? (
                      <ExerciseManageRow
                        exercise={exercise}
                        index={index}
                        key={exercise.id}
                      />
                    ) : (
                      <ExerciseListItem
                        exercise={exercise}
                        index={index}
                        isHistoryLoading={reportExercisesQuery.isPending}
                        isHistoryUnavailable={reportExercisesQuery.isError}
                        key={exercise.id}
                        lastPerformedAt={lastPerformedByExercise.get(
                          exercise.id,
                        )}
                      />
                    ),
                  )}
                </div>
              ) : null}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
