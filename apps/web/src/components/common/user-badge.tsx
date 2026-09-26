import { cn } from '@/lib/utils';

interface UserBadgeProps {
  username: string;
  className?: string;
}

/** Initials tile used wherever the signed-in account is shown. */
export function UserBadge({ username, className }: UserBadgeProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid size-9 shrink-0 place-items-center rounded-sm bg-surface-strong font-mono text-xs font-semibold uppercase text-muted-foreground',
        className,
      )}
    >
      {username.slice(0, 2)}
    </span>
  );
}
