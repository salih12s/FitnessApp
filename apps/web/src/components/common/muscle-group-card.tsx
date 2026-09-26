import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router';

import { MuscleArtwork } from '@/components/common/muscle-artwork';
import type { MuscleGroup } from '@/types/muscle-group';

interface MuscleGroupCardProps {
  muscleGroup: MuscleGroup;
  /** Position in the grid, used for the entry cascade. */
  index?: number;
}

export function MuscleGroupCard({
  muscleGroup,
  index = 0,
}: MuscleGroupCardProps) {
  return (
    <Link
      aria-label={`${muscleGroup.name} kas grubunu aç, ${muscleGroup.exerciseCount} hareket`}
      className="animate-rise group relative isolate flex min-h-40 min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-surface p-4 outline-none transition-[border-color,transform,box-shadow] duration-300 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[0_12px_28px_-18px_var(--shadow-tint)] focus-visible:ring-3 focus-visible:ring-ring active:scale-[0.98] sm:min-h-44"
      style={{ '--i': index }}
      to={`/app/muscles/${muscleGroup.slug}`}
    >
      <MuscleArtwork
        className="absolute -right-3 top-1 -z-10 h-36 w-32 transition-transform duration-500 ease-[var(--ease-out)] group-hover:scale-[1.04] sm:h-40 sm:w-36"
        slug={muscleGroup.slug}
      />
      <ArrowUpRight
        aria-hidden="true"
        className="size-4 text-muted-foreground transition-[color,transform] duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
      />
      <div className="mt-auto min-w-0">
        <h2 className="truncate text-lg font-semibold leading-tight text-foreground">
          {muscleGroup.name}
        </h2>
        <p className="mt-0.5 font-mono text-xs tabular-nums text-muted-foreground">
          {muscleGroup.exerciseCount} hareket
        </p>
      </div>
    </Link>
  );
}
