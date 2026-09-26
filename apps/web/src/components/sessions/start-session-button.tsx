import { Play } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useActiveSession, useStartSession } from './use-active-session';

/** Shown only while no session is active; the session bar takes over after. */
export function StartSessionButton() {
  const { data: session, isSuccess } = useActiveSession();
  const startMutation = useStartSession();

  if (!isSuccess || session) {
    return null;
  }

  return (
    <div>
      <Button
        className="h-11 min-h-11"
        disabled={startMutation.isPending}
        onClick={() => startMutation.mutate()}
      >
        <Play aria-hidden="true" className="size-4" />
        {startMutation.isPending ? 'Başlatılıyor…' : 'Antrenmana başla'}
      </Button>
      {startMutation.isError ? (
        <p className="mt-1.5 text-xs text-destructive" role="alert">
          Antrenman başlatılamadı. Tekrar dene.
        </p>
      ) : null}
    </div>
  );
}
