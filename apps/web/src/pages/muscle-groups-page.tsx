import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowUpRight,
  Dumbbell,
  Plus,
  Search,
} from 'lucide-react';
import { Link } from 'react-router';

import { exerciseKeys, searchExercises } from '@/api/exercises';
import { getMuscleGroups, muscleGroupKeys } from '@/api/muscle-groups';
import {
  getExerciseReport,
  getReportExercises,
  getReportOverview,
  reportKeys,
} from '@/api/reports';
import { ExerciseListItem } from '@/components/common/exercise-list-item';
import { FeedbackPanel } from '@/components/common/feedback-panel';
import { MuscleGroupCard } from '@/components/common/muscle-group-card';
import { PageHeader } from '@/components/common/page-header';
import { SectionHeading } from '@/components/common/section-heading';
import { Sparkline } from '@/components/common/sparkline';
import { OverviewStats } from '@/components/reports/overview-stats';
import { StartSessionButton } from '@/components/sessions/start-session-button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/auth/use-auth';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import {
  formatWeight,
  formatWeightChange,
  formatWeightWithUnit,
  getWeightUnit,
} from '@/lib/format';

function getGreeting(date: Date): string {
  const hour = date.getHours();

  if (hour >= 5 && hour < 12) return 'Günaydın';
  if (hour >= 12 && hour < 18) return 'İyi günler';
  return 'İyi akşamlar';
}

function MuscleGroupLoadingGrid() {
  return (
    <div
      aria-label="Kas grupları yükleniyor"
      className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4"
      role="status"
    >
      {Array.from({ length: 8 }, (_, index) => (
        <div
          aria-hidden="true"
          className="flex min-h-40 flex-col justify-end rounded-lg border border-border bg-surface p-4 sm:min-h-44"
          key={index}
        >
          <div className="skeleton h-5 w-2/3 rounded-sm" />
          <div className="skeleton mt-2 h-3 w-1/3 rounded-sm" />
        </div>
      ))}
    </div>
  );
}

function ExerciseSearchLoading() {
  return (
    <div aria-label="Hareketler aranıyor" className="space-y-2" role="status">
      {Array.from({ length: 3 }, (_, index) => (
        <div
          aria-hidden="true"
          className="skeleton h-18 rounded-lg border border-border"
          key={index}
        />
      ))}
    </div>
  );
}

export function MuscleGroupsPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const normalizedSearchQuery = searchQuery.trim();
  const debouncedSearchQuery = useDebouncedValue(normalizedSearchQuery, 300);
  const isSearchActive = normalizedSearchQuery.length >= 2;
  const isSearchSettled = debouncedSearchQuery === normalizedSearchQuery;

  const muscleGroupsQuery = useQuery({
    queryKey: muscleGroupKeys.all,
    queryFn: getMuscleGroups,
  });
  const searchQueryResult = useQuery({
    queryKey: exerciseKeys.search(debouncedSearchQuery),
    queryFn: () => searchExercises(debouncedSearchQuery),
    enabled: debouncedSearchQuery.length >= 2,
    retry: 1,
  });
  const reportExercisesQuery = useQuery({
    queryKey: reportKeys.exercises,
    queryFn: () => getReportExercises(),
    retry: 1,
  });
  const latestReportExercise = reportExercisesQuery.data?.[0];
  const overviewQuery = useQuery({
    queryKey: reportKeys.overview,
    queryFn: () => getReportOverview(),
    enabled: Boolean(latestReportExercise),
    retry: 1,
  });
  const latestReportQuery = useQuery({
    queryKey: reportKeys.detail(
      latestReportExercise?.slug ?? '',
      latestReportExercise?.isCustom ?? false,
      'all',
    ),
    queryFn: () =>
      getExerciseReport(
        latestReportExercise?.slug ?? '',
        latestReportExercise?.isCustom ?? false,
        'all',
      ),
    enabled: Boolean(latestReportExercise),
    retry: 1,
  });

  const muscleGroups = muscleGroupsQuery.data ?? [];
  const searchResults = searchQueryResult.data ?? [];
  const latestSummary = latestReportQuery.data?.summary;
  const trendValues = (latestReportQuery.data?.points ?? []).map((point) =>
    Number(point.maxWeightKg),
  );
  const lastPerformedByExercise = new Map(
    (reportExercisesQuery.data ?? []).map((exercise) => [
      exercise.id,
      exercise.latestPerformedAt,
    ]),
  );

  return (
    <div>
      <PageHeader
        action={
          <div className="flex flex-wrap items-start gap-2">
            <StartSessionButton />
            <Link
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border-strong bg-surface px-4 text-sm font-semibold text-foreground shadow-[0_1px_2px_var(--shadow-tint)] outline-none transition-[background-color,transform] duration-200 hover:bg-surface-elevated focus-visible:ring-3 focus-visible:ring-ring active:scale-[0.98]"
              to="/app/exercises/custom/new"
            >
              <Plus aria-hidden="true" className="size-4" />
              Özel hareket
            </Link>
          </div>
        }
        description="Bir kas grubu seç ya da hareketi ada, kasa veya ekipmana göre ara."
        title={`${getGreeting(new Date())}, ${user?.username ?? ''}`}
      />

      {overviewQuery.data ? (
        <div className="animate-rise mt-6" style={{ '--i': 2 }}>
          <OverviewStats overview={overviewQuery.data} />
        </div>
      ) : null}

      {latestSummary && latestReportExercise ? (
        <Link
          aria-label={`${latestReportExercise.name} gelişim raporunu aç`}
          className="animate-rise group mt-2 grid gap-4 rounded-lg border border-border bg-surface p-4 outline-none transition-[border-color,box-shadow] duration-200 hover:border-border-strong hover:shadow-[0_12px_28px_-20px_var(--shadow-tint)] focus-visible:ring-3 focus-visible:ring-ring sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:items-end sm:gap-8 sm:p-5"
          style={{ '--i': 2 }}
          to="/app/reports"
        >
          <div className="min-w-0">
            <p className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <span className="truncate">
                Son çalışılan · {latestReportExercise.name}
              </span>
              <ArrowUpRight
                aria-hidden="true"
                className="size-4 shrink-0 transition-[color,transform] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary sm:hidden"
              />
            </p>
            <p className="mt-2 flex items-baseline gap-3">
              <span className="metric-number text-4xl font-semibold text-foreground">
                {formatWeight(latestSummary.currentWeightKg)}
                <span className="ml-1 text-base font-normal text-muted-foreground">
                  {getWeightUnit()}
                </span>
              </span>
              <span className="metric-number text-sm font-semibold text-primary">
                {formatWeightChange(latestSummary.increaseKg)} {getWeightUnit()}
              </span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Başlangıç{' '}
              <span className="font-mono tabular-nums">
                {formatWeightWithUnit(latestSummary.startingWeightKg)}
              </span>
              <span className="mx-1.5">·</span>
              Rekor{' '}
              <span className="font-mono tabular-nums">
                {formatWeightWithUnit(latestSummary.personalRecordKg)}
              </span>
            </p>
          </div>
          <Sparkline values={trendValues} />
        </Link>
      ) : null}

      <section aria-labelledby="exercise-search-title" className="mt-8">
        <h2 className="sr-only" id="exercise-search-title">
          Hareket bul
        </h2>
        <div className="relative sm:max-w-xl">
          <label className="sr-only" htmlFor="exercise-search">
            Hareket ara
          </label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 size-4.5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            autoComplete="off"
            className="h-12 pl-11"
            id="exercise-search"
            name="exercise-search"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Hareket, kas ya da ekipman ara: göğüs, dambıl, barfiks…"
            type="search"
            value={searchQuery}
          />
        </div>
      </section>

      {isSearchActive ? (
        <section
          aria-labelledby="exercise-search-results-title"
          className="mt-5 max-w-xl"
        >
          <SectionHeading
            id="exercise-search-results-title"
            meta={
              isSearchSettled && searchQueryResult.isSuccess
                ? `${searchResults.length} hareket`
                : undefined
            }
            title="Arama sonuçları"
          />

          <div className="mt-4">
            {searchQueryResult.isPending ||
            debouncedSearchQuery !== normalizedSearchQuery ? (
              <ExerciseSearchLoading />
            ) : null}

            {isSearchSettled && searchQueryResult.isError ? (
              <FeedbackPanel
                actionLabel="Tekrar dene"
                description="Hareket araması tamamlanamadı. Yeniden deneyebilirsin."
                icon={AlertTriangle}
                isActionPending={searchQueryResult.isFetching}
                onAction={() => void searchQueryResult.refetch()}
                title="Arama yapılamadı"
              />
            ) : null}

            {isSearchSettled &&
            searchQueryResult.isSuccess &&
            searchResults.length === 0 ? (
              <FeedbackPanel
                description={`“${normalizedSearchQuery}” için eşleşen bir hareket bulunamadı. Hareket adı, kas grubu ya da ekipman (halter, dambıl, kablo) yazmayı dene.`}
                icon={Search}
                title="Sonuç bulunamadı"
              />
            ) : null}

            {isSearchSettled &&
            searchQueryResult.isSuccess &&
            searchResults.length > 0 ? (
              <div className="grid gap-2">
                {searchResults.map((exercise, index) => (
                  <ExerciseListItem
                    exercise={exercise}
                    index={index}
                    isHistoryLoading={reportExercisesQuery.isPending}
                    isHistoryUnavailable={reportExercisesQuery.isError}
                    key={exercise.id}
                    lastPerformedAt={lastPerformedByExercise.get(exercise.id)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="muscle-groups-title" className="mt-8 sm:mt-10">
        <SectionHeading
          id="muscle-groups-title"
          meta={
            muscleGroupsQuery.isPending
              ? 'Yükleniyor'
              : `${muscleGroups.length} grup`
          }
          title="Kas grupları"
        />

        <div className="mt-4 sm:mt-5">
          {muscleGroupsQuery.isPending ? <MuscleGroupLoadingGrid /> : null}

          {muscleGroupsQuery.isError ? (
            <FeedbackPanel
              actionLabel="Tekrar dene"
              description="Sunucudan kas grupları alınamadı. Bağlantını kontrol edip tekrar deneyebilirsin."
              icon={AlertTriangle}
              isActionPending={muscleGroupsQuery.isFetching}
              onAction={() => void muscleGroupsQuery.refetch()}
              title="Kas grupları yüklenemedi"
            />
          ) : null}

          {muscleGroupsQuery.isSuccess && muscleGroups.length === 0 ? (
            <FeedbackPanel
              description="Henüz görüntülenecek bir kas grubu bulunmuyor."
              icon={Dumbbell}
              title="Kas grubu bulunamadı"
            />
          ) : null}

          {muscleGroups.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {muscleGroups.map((muscleGroup, index) => (
                <MuscleGroupCard
                  index={index}
                  key={muscleGroup.id}
                  muscleGroup={muscleGroup}
                />
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
