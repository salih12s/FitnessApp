import { Trophy } from 'lucide-react';
import { Link } from 'react-router';

import { useScopedAppPath } from '@/lib/client-scope';
import { exercisePath } from '@/lib/exercise-path';
import { formatWeightWithUnit } from '@/lib/format';
import type { PersonalRecordEvent } from '@/types/report';

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
});

export function RecentRecords({ records }: { records: PersonalRecordEvent[] }) {
  const appPath = useScopedAppPath();
  if (records.length === 0) {
    return (
      <p className="text-sm leading-6 text-muted-foreground">
        Henüz rekor yok. Bir hareketi önceki kayıtlarından daha ağır yaptığında
        burada görünür.
      </p>
    );
  }

  return (
    <ol className="grid gap-1">
      {records.map((record) => (
        <li key={`${record.exercise.slug}-${record.performedAt}`}>
          <Link
            className="group -mx-2 flex min-h-14 items-center gap-3 rounded-md px-2 outline-none transition-colors hover:bg-surface-strong/60 focus-visible:ring-3 focus-visible:ring-ring"
            to={appPath(exercisePath(record.exercise))}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-sm bg-primary/12 text-primary">
              <Trophy aria-hidden="true" className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-foreground">
                {record.exercise.name}
              </span>
              <span className="block font-mono text-xs tabular-nums text-muted-foreground">
                önceki {formatWeightWithUnit(record.previousKg)} ·{' '}
                {dateFormatter.format(new Date(record.performedAt))}
              </span>
            </span>
            <span className="shrink-0 text-right font-mono text-sm font-semibold tabular-nums text-primary">
              {formatWeightWithUnit(record.weightKg)}
              <span className="block text-xs font-normal text-muted-foreground">
                × {record.reps}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
