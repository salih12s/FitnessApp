import { AlertTriangle } from 'lucide-react';

import { FeedbackPanel } from '@/components/common/feedback-panel';
import type { ExerciseLog } from '@/types/exercise';
import { LogCardActions } from './log-card-actions';

interface RecentWorkoutProps {
  isError: boolean;
  isFetching: boolean;
  isPending: boolean;
  recentLog?: ExerciseLog;
  exerciseSlug: string;
  isCustom: boolean;
  onRetry: () => void;
}

const workoutDateFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export function RecentWorkout({
  isError,
  isFetching,
  isPending,
  recentLog,
  exerciseSlug,
  isCustom,
  onRetry,
}: RecentWorkoutProps) {
  if (isPending) {
    return (
      <section
        aria-label="Son antrenman yükleniyor"
        className="rounded-lg border border-border bg-surface p-4 sm:p-5"
        role="status"
      >
        <div className="skeleton h-5 w-32 rounded-sm" />
        <div className="skeleton mt-5 h-4 w-full rounded-sm" />
        <div className="skeleton mt-3 h-4 w-full rounded-sm" />
      </section>
    );
  }

  if (isError) {
    return (
      <FeedbackPanel
        actionLabel="Tekrar dene"
        description="Son antrenman bilgisi alınamadı. Yeniden deneyebilirsin."
        icon={AlertTriangle}
        isActionPending={isFetching}
        onAction={onRetry}
        title="Son antrenman yüklenemedi"
      />
    );
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">
          Son antrenman
        </h2>
        {recentLog ? (
          <p className="font-mono text-xs tabular-nums text-muted-foreground">
            {workoutDateFormatter.format(new Date(recentLog.performedAt))}
          </p>
        ) : null}
      </div>

      {recentLog ? (
        <>
          <ol className="mt-3 divide-y divide-border">
            {recentLog.sets.map((set) => (
              <li
                className="flex min-h-11 items-center justify-between gap-4 py-2 text-sm"
                key={set.setNumber}
              >
                <span className="text-muted-foreground">
                  Set {set.setNumber}
                </span>
                <span className="metric-number text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {set.weightKg}
                  </span>{' '}
                  kg ×{' '}
                  <span className="font-semibold text-foreground">
                    {set.reps}
                  </span>
                </span>
              </li>
            ))}
          </ol>
          <LogCardActions
            key={recentLog.id}
            log={recentLog}
            exerciseSlug={exerciseSlug}
            isCustom={isCustom}
          />
        </>
      ) : (
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Bu hareket için henüz kaydedilmiş bir antrenmanın yok.
        </p>
      )}
    </section>
  );
}
