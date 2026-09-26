import { useInfiniteQuery } from '@tanstack/react-query';
import { AlertTriangle, CalendarDays, ChevronDown } from 'lucide-react';
import { Link } from 'react-router';

import { getHistory } from '@/api/exercises';
import { FeedbackPanel } from '@/components/common/feedback-panel';
import { PageHeader } from '@/components/common/page-header';
import { LogCardActions } from '@/components/workouts/log-card-actions';
import { Button } from '@/components/ui/button';
import { exercisePath } from '@/lib/exercise-path';
import { formatWeight } from '@/lib/format';
import type { HistoryLog } from '@/types/history';

const historyKeys = {
  all: ['history'] as const,
};

const dateHeadingFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function HistoryLoading() {
  return (
    <div
      aria-label="Geçmiş yükleniyor"
      className="mt-8 space-y-8"
      role="status"
    >
      {Array.from({ length: 2 }, (_, groupIndex) => (
        <div className="space-y-3" key={groupIndex}>
          <div className="skeleton h-4 w-32 rounded-sm" />
          <div className="skeleton h-28 rounded-lg border border-border" />
        </div>
      ))}
    </div>
  );
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function groupByDate(logs: HistoryLog[]): [string, HistoryLog[]][] {
  const groups = new Map<string, HistoryLog[]>();

  for (const log of logs) {
    const key = formatDateKey(new Date(log.performedAt));
    const group = groups.get(key);

    if (group) {
      group.push(log);
    } else {
      groups.set(key, [log]);
    }
  }

  return [...groups.entries()];
}

function HistoryLogCard({ log, index }: { log: HistoryLog; index: number }) {
  const topWeight = log.sets.reduce(
    (maximum, set) => Math.max(maximum, Number(set.weightKg)),
    0,
  );

  return (
    <article
      className="animate-rise rounded-lg border border-border bg-surface p-4 sm:p-5"
      style={{ '--i': index }}
    >
      <div className="flex items-start justify-between gap-3">
        <Link
          className="group min-w-0 rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring"
          to={exercisePath(log.exercise)}
        >
          <span className="block break-words text-[0.9375rem] font-semibold text-foreground transition-colors group-hover:text-primary">
            {log.exercise.name}
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {log.exercise.muscleGroup.name} ·{' '}
            <span className="font-mono tabular-nums">
              {log.sets.length} set
            </span>
          </span>
        </Link>
        <p className="shrink-0 text-right">
          <span className="metric-number block text-lg font-semibold leading-none text-foreground">
            {formatWeight(topWeight)}
            <span className="ml-0.5 text-xs font-normal text-muted-foreground">
              kg
            </span>
          </span>
          <span className="mt-1 block text-[0.6875rem] text-muted-foreground">
            en ağır set
          </span>
        </p>
      </div>
      <div className="mt-3">
        <LogCardActions
          exerciseSlug={log.exercise.slug}
          isCustom={log.exercise.isCustom}
          log={log}
          summary={
            <ol className="flex flex-wrap gap-1.5">
              {log.sets.map((set) => (
                <li
                  className="metric-number rounded-sm bg-surface-strong px-2 py-1 text-xs text-muted-foreground"
                  key={set.setNumber}
                >
                  <span className="font-semibold text-foreground">
                    {formatWeight(set.weightKg)}
                  </span>
                  {' × '}
                  <span className="font-semibold text-foreground">
                    {set.reps}
                  </span>
                </li>
              ))}
            </ol>
          }
          variant="menu"
        />
      </div>
    </article>
  );
}

export function HistoryPage() {
  const historyQuery = useInfiniteQuery({
    queryKey: historyKeys.all,
    queryFn: ({ pageParam }) => getHistory({ page: pageParam, limit: 20 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasNextPage ? lastPage.page + 1 : undefined,
    retry: 1,
  });
  const logs = historyQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const dateGroups = groupByDate(logs);

  return (
    <div>
      <PageHeader
        description="Kaydettiğin setleri tarihe göre incele ve hareket detaylarına geri dön."
        title="Antrenmanlar"
      />

      {historyQuery.isPending ? <HistoryLoading /> : null}

      {historyQuery.isError ? (
        <div className="mt-8">
          <FeedbackPanel
            actionLabel="Tekrar dene"
            description="Geçmiş kayıtların alınamadı. Yeniden deneyebilirsin."
            icon={AlertTriangle}
            isActionPending={historyQuery.isFetching}
            onAction={() => void historyQuery.refetch()}
            title="Geçmiş yüklenemedi"
          />
        </div>
      ) : null}

      {historyQuery.isSuccess && logs.length === 0 ? (
        <div className="mt-8">
          <FeedbackPanel
            description="Bir egzersiz sayfasından ilk antrenmanını kaydettiğinde kayıtların burada görünecek."
            icon={CalendarDays}
            title="Henüz kayıtlı antrenman yok"
          />
        </div>
      ) : null}

      {dateGroups.length > 0 ? (
        <div className="mt-8 space-y-7">
          {dateGroups.map(([dateKey, dateLogs]) => (
            <section aria-labelledby={`history-date-${dateKey}`} key={dateKey}>
              <h2
                className="mb-2.5 flex items-baseline justify-between gap-3 text-sm font-semibold text-foreground"
                id={`history-date-${dateKey}`}
              >
                {dateHeadingFormatter.format(new Date(`${dateKey}T12:00:00`))}
                <span className="font-mono text-xs font-normal tabular-nums text-muted-foreground">
                  {dateLogs.length} hareket
                </span>
              </h2>
              <div className="grid gap-2">
                {dateLogs.map((log, index) => (
                  <HistoryLogCard index={index} key={log.id} log={log} />
                ))}
              </div>
            </section>
          ))}

          {historyQuery.hasNextPage ? (
            <Button
              className="w-full"
              disabled={historyQuery.isFetchingNextPage}
              onClick={() => void historyQuery.fetchNextPage()}
              variant="secondary"
            >
              <ChevronDown aria-hidden="true" className="size-4" />
              {historyQuery.isFetchingNextPage
                ? 'Yükleniyor…'
                : 'Daha fazla göster'}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
