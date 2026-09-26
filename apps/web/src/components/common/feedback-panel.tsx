import type { LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface FeedbackPanelProps {
  title: string;
  description: string;
  icon: LucideIcon;
  actionLabel?: string;
  isActionPending?: boolean;
  onAction?: () => void;
}

export function FeedbackPanel({
  actionLabel,
  description,
  icon: Icon,
  isActionPending = false,
  onAction,
  title,
}: FeedbackPanelProps) {
  return (
    <div className="animate-rise rounded-lg border border-border bg-surface p-5 sm:p-6">
      <div className="grid size-10 place-items-center rounded-md bg-surface-strong text-muted-foreground">
        <Icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
      </div>
      <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-xl text-pretty text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {actionLabel && onAction ? (
        <Button
          className="mt-4"
          disabled={isActionPending}
          onClick={onAction}
          variant="secondary"
        >
          {isActionPending ? 'Tekrar deneniyor…' : actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
