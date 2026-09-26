import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, Dumbbell, Trophy } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router';

import {
  exerciseKeys,
  getExercise,
  getRecentExerciseLogs,
} from '@/api/exercises';
import { getExerciseReport, reportKeys } from '@/api/reports';
import { BenchPressAnimation } from '@/components/common/bench-press-animation';
import { FeedbackPanel } from '@/components/common/feedback-panel';
import { PageHeader } from '@/components/common/page-header';
import { RecentWorkout } from '@/components/workouts/recent-workout';
import { WorkoutEntrySection } from '@/components/workouts/workout-entry-section';
import { ApiError } from '@/lib/api';
import { formatWeight } from '@/lib/format';

interface ExercisePageProps {
  isCustom?: boolean;
}

export function ExercisePage({ isCustom = false }: ExercisePageProps) {
  const { slug } = useParams();
  const exerciseQuery = useQuery({
    queryKey: exerciseKeys.detail(slug ?? '', isCustom),
    queryFn: () => getExercise(slug ?? '', isCustom),
    enabled: Boolean(slug),
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.status === 404) && failureCount < 2,
  });
  const recentLogsQuery = useQuery({
    queryKey: exerciseKeys.logs(slug ?? '', isCustom),
    queryFn: () => getRecentExerciseLogs(slug ?? '', isCustom),
    enabled: Boolean(slug && exerciseQuery.isSuccess),
    retry: 1,
  });
  const reportQuery = useQuery({
    queryKey: reportKeys.detail(slug ?? '', isCustom, 'all'),
    queryFn: () => getExerciseReport(slug ?? '', isCustom, 'all'),
    enabled: Boolean(slug && exerciseQuery.isSuccess),
    retry: 1,
  });

  if (!slug) {
    return <Navigate replace to="/app" />;
  }

  if (
    exerciseQuery.error instanceof ApiError &&
    exerciseQuery.error.status === 404
  ) {
    return <Navigate replace to="/app" />;
  }

  const exercise = exerciseQuery.data;
  const summary = reportQuery.data?.summary;

  return (
    <div>
      <Link
        className="group inline-flex -ml-1 min-h-11 items-center gap-1.5 rounded-md px-1 text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring"
        to={exercise ? `/app/muscles/${exercise.muscleGroup.slug}` : '/app'}
      >
        <ArrowLeft
          aria-hidden="true"
          className="size-4 transition-transform group-hover:-translate-x-0.5"
        />
        {exercise
          ? `${exercise.muscleGroup.name} hareketlerine dön`
          : 'Geri dön'}
      </Link>

      {exerciseQuery.isPending ? (
        <>
          <PageHeader
            className="mt-6"
            description="Hareket bilgileri sunucudan alınıyor."
            title="Yükleniyor…"
          />
          <div className="mt-8" role="status">
            <FeedbackPanel
              description="Bu işlem yalnızca kısa bir süre almalı."
              icon={Dumbbell}
              title="Hareket yükleniyor"
            />
          </div>
        </>
      ) : null}

      {exerciseQuery.isError ? (
        <>
          <PageHeader
            className="mt-6"
            description="Hareket bilgisine şu anda ulaşılamıyor."
            title="Bir sorun oluştu"
          />
          <div className="mt-8">
            <FeedbackPanel
              actionLabel="Tekrar dene"
              description="Sunucuya yeniden bağlanmayı deneyebilirsin."
              icon={AlertTriangle}
              isActionPending={exerciseQuery.isFetching}
              onAction={() => void exerciseQuery.refetch()}
              title="Hareket yüklenemedi"
            />
          </div>
        </>
      ) : null}

      {exercise ? (
        <>
          <header className="mt-4">
            <p className="animate-rise flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              <span>{exercise.muscleGroup.name}</span>
              <span aria-hidden="true">·</span>
              <span>{exercise.equipment ?? 'Ekipmansız'}</span>
              {exercise.isCustom ? (
                <span className="rounded-sm bg-primary/12 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-primary">
                  Özel hareket
                </span>
              ) : null}
            </p>
            <h1
              className="animate-rise mt-1 text-3xl font-semibold leading-tight text-foreground sm:text-4xl"
              style={{ '--i': 1 }}
            >
              {exercise.name}
            </h1>

            <dl
              className="animate-rise mt-5 grid grid-cols-2 gap-2 sm:max-w-md"
              style={{ '--i': 2 }}
            >
              <div className="rounded-lg border border-border bg-surface p-4">
                <dt className="text-xs text-muted-foreground">Son ağırlık</dt>
                <dd className="metric-number mt-1 text-2xl font-semibold text-foreground">
                  {summary ? formatWeight(summary.currentWeightKg) : '-'}
                  {summary ? (
                    <span className="ml-1 text-sm font-normal text-muted-foreground">
                      kg
                    </span>
                  ) : null}
                </dd>
              </div>
              <div className="rounded-lg border border-border bg-surface p-4">
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Trophy
                    aria-hidden="true"
                    className="size-3.5 text-primary"
                  />
                  Kişisel rekor
                </dt>
                <dd className="metric-number mt-1 text-2xl font-semibold text-primary">
                  {summary ? formatWeight(summary.personalRecordKg) : '-'}
                  {summary ? (
                    <span className="ml-1 text-sm font-normal">kg</span>
                  ) : null}
                </dd>
              </div>
            </dl>
          </header>

          {!exercise.isCustom && exercise.slug === 'barbell-bench-press' ? (
            <BenchPressAnimation />
          ) : null}

          <WorkoutEntrySection
            exerciseSlug={exercise.slug}
            isCustom={exercise.isCustom}
            key={exercise.id}
            recentLog={recentLogsQuery.data?.[0]}
          />

          <div className="mt-3">
            <RecentWorkout
              isError={recentLogsQuery.isError}
              isFetching={recentLogsQuery.isFetching}
              isPending={recentLogsQuery.isPending}
              onRetry={() => void recentLogsQuery.refetch()}
              recentLog={recentLogsQuery.data?.[0]}
              exerciseSlug={exercise.slug}
              isCustom={exercise.isCustom}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
