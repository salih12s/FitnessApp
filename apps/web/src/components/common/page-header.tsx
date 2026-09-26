import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Optional control shown beside the title on wide screens. */
  action?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  action,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0 max-w-2xl">
        <h1 className="animate-rise text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p
            className="animate-rise mt-2 max-w-[60ch] text-pretty text-[0.9375rem] leading-6 text-muted-foreground"
            style={{ '--i': 1 }}
          >
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
