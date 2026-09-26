import { cn } from '@/lib/utils';

interface SectionHeadingProps {
  title: string;
  description?: string;
  meta?: string;
  id?: string;
  className?: string;
}

export function SectionHeading({
  title,
  description,
  meta,
  id,
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn('flex items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        <h2
          className="text-lg font-semibold leading-tight text-foreground"
          id={id}
        >
          {title}
        </h2>
        {description ? (
          <p className="mt-1 max-w-xl text-sm leading-5 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {meta ? (
        <p className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
          {meta}
        </p>
      ) : null}
    </div>
  );
}
