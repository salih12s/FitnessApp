import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, X } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';

import { finishSession, sessionKeys } from '@/api/sessions';
import { Button } from '@/components/ui/button';
import { formatWeight } from '@/lib/format';
import { formatDuration, formatElapsed } from '@/lib/session-time';
import type { WorkoutSession } from '@/types/session';
import { useActiveSession } from './use-active-session';

const easeOut = [0.16, 1, 0.3, 1] as const;

function useNow(isRunning: boolean): number {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    if (!isRunning) return;
    // Elapsed time is derived from startedAt, so a throttled background tab
    // shows the right value as soon as it ticks again.
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [isRunning]);

  return now;
}

function SummaryValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-surface-strong px-3 py-2">
      <dt className="text-[0.6875rem] text-muted-foreground">{label}</dt>
      <dd className="metric-number text-sm font-semibold text-foreground">
        {value}
      </dd>
    </div>
  );
}

type FinishResult =
  | { kind: 'saved'; durationMs: number; totalVolumeKg: string }
  | { kind: 'empty' };

export function ActiveSessionBar() {
  const queryClient = useQueryClient();
  const { data: session } = useActiveSession();
  const [isFinishing, setIsFinishing] = useState(false);
  const [note, setNote] = useState('');
  const [result, setResult] = useState<FinishResult | null>(null);
  const now = useNow(Boolean(session));

  const finishMutation = useMutation({
    mutationFn: (active: WorkoutSession) => finishSession(active.id, note),
    onSuccess: async (finished) => {
      setIsFinishing(false);
      setNote('');
      setResult(
        finished
          ? {
              kind: 'saved',
              durationMs:
                new Date(finished.endedAt ?? finished.startedAt).getTime() -
                new Date(finished.startedAt).getTime(),
              totalVolumeKg: finished.totalVolumeKg,
            }
          : { kind: 'empty' },
      );
      queryClient.setQueryData(sessionKeys.active, null);
      await queryClient.invalidateQueries({ queryKey: ['history'] });
    },
  });

  useEffect(() => {
    if (!result) return;
    const timer = window.setTimeout(() => setResult(null), 5000);
    return () => window.clearTimeout(timer);
  }, [result]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (session) finishMutation.mutate(session);
  }

  const elapsed = session ? now - new Date(session.startedAt).getTime() : 0;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-30 px-3 sm:px-8 lg:sticky lg:top-0 lg:bottom-auto lg:px-12">
      <AnimatePresence initial={false} mode="wait">
        {session ? (
          <m.section
            animate={{ opacity: 1, y: 0 }}
            aria-label="Aktif antrenman"
            className="pointer-events-auto mx-auto w-full max-w-2xl rounded-lg lg:mt-4 lg:max-w-[58rem] border border-border-strong bg-surface/95 p-3 shadow-[0_16px_40px_-20px_var(--shadow-tint)] backdrop-blur-lg"
            exit={{ opacity: 0, y: 12, transition: { duration: 0.15 } }}
            initial={{ opacity: 0, y: 16 }}
            key="active"
            layout
            transition={{ duration: 0.3, ease: easeOut }}
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="size-2 shrink-0 rounded-full bg-primary"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">
                  Antrenman sürüyor
                </p>
                <p className="flex items-baseline gap-2">
                  <span className="metric-number text-lg font-semibold text-foreground">
                    {formatElapsed(elapsed)}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    <span className="font-mono tabular-nums">
                      {session.exerciseCount}
                    </span>{' '}
                    hareket
                  </span>
                </p>
              </div>
              {!isFinishing ? (
                <Button
                  className="h-11 min-h-11 px-4"
                  onClick={() => {
                    finishMutation.reset();
                    setIsFinishing(true);
                  }}
                  variant="secondary"
                >
                  Bitir
                </Button>
              ) : null}
            </div>

            {isFinishing ? (
              <form className="mt-3" onSubmit={submit}>
                <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <SummaryValue label="Süre" value={formatDuration(elapsed)} />
                  <SummaryValue
                    label="Hareket"
                    value={String(session.exerciseCount)}
                  />
                  <SummaryValue label="Set" value={String(session.setCount)} />
                  <SummaryValue
                    label="Hacim"
                    value={`${formatWeight(session.totalVolumeKg)} kg`}
                  />
                </dl>
                {session.exerciseCount === 0 ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Henüz kayıt yok. Bitirirsen bu antrenman silinir.
                  </p>
                ) : null}
                <label
                  className="mt-3 block text-sm font-medium text-foreground"
                  htmlFor="session-note"
                >
                  Not{' '}
                  <span className="font-normal text-muted-foreground">
                    (isteğe bağlı)
                  </span>
                </label>
                <textarea
                  className="mt-1.5 min-h-20 w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-base text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring sm:text-sm"
                  id="session-note"
                  maxLength={1000}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Nasıl geçti?"
                  value={note}
                />
                {finishMutation.isError ? (
                  <p className="mt-2 text-sm text-destructive" role="alert">
                    Antrenman bitirilemedi. Bağlantını kontrol edip tekrar dene.
                  </p>
                ) : null}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    disabled={finishMutation.isPending}
                    onClick={() => setIsFinishing(false)}
                    variant="secondary"
                  >
                    Vazgeç
                  </Button>
                  <Button disabled={finishMutation.isPending} type="submit">
                    {finishMutation.isPending
                      ? 'Bitiriliyor…'
                      : 'Antrenmanı bitir'}
                  </Button>
                </div>
              </form>
            ) : null}
          </m.section>
        ) : result ? (
          <m.section
            animate={{ opacity: 1, y: 0 }}
            className="pointer-events-auto mx-auto flex w-full max-w-2xl items-center lg:mt-4 lg:max-w-[58rem] gap-3 rounded-lg border border-success/25 bg-surface/95 p-3 shadow-[0_16px_40px_-20px_var(--shadow-tint)] backdrop-blur-lg"
            exit={{ opacity: 0, y: 12, transition: { duration: 0.15 } }}
            initial={{ opacity: 0, y: 16 }}
            key="result"
            role="status"
            transition={{ duration: 0.3, ease: easeOut }}
          >
            <CheckCircle2
              aria-hidden="true"
              className="size-5 shrink-0 text-success"
            />
            <p className="min-w-0 flex-1 text-sm text-foreground">
              {result.kind === 'saved' ? (
                <>
                  Antrenman kaydedildi.{' '}
                  <span className="text-muted-foreground">
                    {formatDuration(result.durationMs)} ·{' '}
                    {formatWeight(result.totalVolumeKg)} kg hacim
                  </span>
                </>
              ) : (
                'Kayıt olmadığı için antrenman silindi.'
              )}
            </p>
            <Button
              aria-label="Kapat"
              className="size-9 min-h-9 text-muted-foreground"
              onClick={() => setResult(null)}
              size="icon"
              variant="ghost"
            >
              <X aria-hidden="true" className="size-4" />
            </Button>
          </m.section>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
