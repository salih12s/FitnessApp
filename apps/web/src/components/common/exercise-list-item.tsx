import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';

import { exercisePath } from '@/lib/exercise-path';
import type { ExerciseSummary } from '@/types/exercise';

interface ExerciseListItemProps {
  exercise: ExerciseSummary;
  lastPerformedAt?: string;
  isHistoryLoading?: boolean;
  isHistoryUnavailable?: boolean;
  /** Position in the list, used for the entry cascade. */
  index?: number;
}

const shortDateFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
});

export function ExerciseListItem({
  exercise,
  lastPerformedAt,
  isHistoryLoading = false,
  isHistoryUnavailable = false,
  index = 0,
}: ExerciseListItemProps) {
  const historyLabel = lastPerformedAt
    ? shortDateFormatter.format(new Date(lastPerformedAt))
    : isHistoryLoading
      ? 'Kontrol ediliyor'
      : isHistoryUnavailable
        ? 'Bilgi alınamadı'
        : 'Henüz kayıt yok';

  return (
    <Link
      className="animate-rise group flex min-h-18 items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 outline-none transition-[border-color,box-shadow] duration-200 hover:border-border-strong hover:shadow-[0_8px_20px_-16px_var(--shadow-tint)] focus-visible:ring-3 focus-visible:ring-ring active:scale-[0.99]"
      style={{ '--i': index }}
      to={exercisePath(exercise)}
    >
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[0.9375rem] font-semibold text-foreground">
            {exercise.name}
          </span>
          {exercise.isCustom ? (
            <span className="shrink-0 rounded-sm bg-primary/12 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-primary">
              Özel
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {exercise.muscleGroup.name}
          {exercise.equipment ? ` · ${exercise.equipment}` : ''}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-[0.6875rem] text-muted-foreground">
          Son kayıt
        </span>
        <span
          className={
            lastPerformedAt
              ? 'block font-mono text-xs font-medium tabular-nums text-foreground'
              : 'block text-xs text-muted-foreground'
          }
        >
          {historyLabel}
        </span>
      </span>
      <ChevronRight
        aria-hidden="true"
        className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5"
      />
    </Link>
  );
}
