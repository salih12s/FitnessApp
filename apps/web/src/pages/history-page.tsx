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
import { groupHistory, totalVolumeKg } from '@/lib/history-groups';
import { formatClock, formatDuration } from '@/lib/session-time';
import type { HistoryLog } from '@/types/history';
import type { HistorySession } from '@/types/session';

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

function SessionBlock({
  session,
  logs,
}: {
  session: HistorySession;
  logs: HistoryLog[];
}) {
  const volume = totalVolumeKg(logs);

  return (
    <section
      aria-label={`Antrenman, ${formatClock(session.startedAt)}`}
      className="rounded-lg border border-border bg-surface-soft p-1.5"
    >
      <header className="px-2.5 pb-2.5 pt-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <h3 className="text-sm font-semibold text-foreground">
            Antrenman{' '}
            <span className="font-mono text-xs font-normal tabular-nums text-muted-foreground">
              {formatClock(session.startedAt)}
              {session.endedAt ? ` - ${formatClock(session.endedAt)}` : ''}
            </span>
          </h3>
          <p className="font-mono text-xs tabular-nums text-muted-foreground">
            {session.endedAt ? (
              formatDuration(
                new Date(session.endedAt).getTime() -
                  new Date(session.startedAt).getTime(),
              )
            ) : (
              <span className="font-sans font-medium text-primary">
                Devam ediyor
              </span>
            )}
            {' · '}
            {logs.length} hareket · {formatWeight(volume)} kg
          </p>
        </div>
        {session.note ? (
          <p className="mt-1.5 text-pretty text-sm text-muted-foreground">
            {session.note}
          </p>
        ) : null}
      </header>
      <div className="grid gap-1.5">
        {logs.map((log, index) => (
          <HistoryLogCard index={index} key={log.id} log={log} />
        ))}
      </div>
    </section>
  );
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
  const days = groupHistory(logs);

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

      {days.length > 0 ? (
        <div className="mt-8 space-y-7">
          {days.map(({ dateKey, logCount, blocks }) => (
            <section aria-labelledby={`history-date-${dateKey}`} key={dateKey}>
              <h2
                className="mb-2.5 flex items-baseline justify-between gap-3 text-sm font-semibold text-foreground"
                id={`history-date-${dateKey}`}
              >
                {dateHeadingFormatter.format(new Date(`${dateKey}T12:00:00`))}
                <span className="font-mono text-xs font-normal tabular-nums text-muted-foreground">
                  {logCount} hareket
                </span>
              </h2>
              <div className="grid gap-2">
                {blocks.map((block, index) =>
                  block.kind === 'session' ? (
                    <SessionBlock
                      key={`session-${block.session.id}`}
                      logs={block.logs}
                      session={block.session}
                    />
                  ) : (
                    <HistoryLogCard
                      index={index}
                      key={block.log.id}
                      log={block.log}
                    />
                  ),
                )}
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
