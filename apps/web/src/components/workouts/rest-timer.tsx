import { useEffect, useState } from 'react';
import { Clock3, Plus, SkipForward } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  formatCountdown,
  getRestDuration,
  progressPercent,
  remainingSeconds,
  REST_PRESETS,
  setRestDuration,
} from '@/lib/rest-timer';

type TimerPhase = 'ready' | 'running' | 'finished' | 'skipped';

export function RestTimer() {
  const [duration, setDuration] = useState(getRestDuration);
  const [phase, setPhase] = useState<TimerPhase>('ready');
  const [startAt, setStartAt] = useState(0);
  const [endAt, setEndAt] = useState(0);
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    if (phase !== 'running') return;

    const refresh = () => {
      const current = Date.now();
      setNow(current);
      if (current >= endAt) {
        setPhase('finished');
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200]);
        }
      }
    };
    const interval = window.setInterval(refresh, 250);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [endAt, phase]);

  function start() {
    const current = Date.now();
    setStartAt(current);
    setEndAt(current + duration * 1000);
    setNow(current);
    setPhase('running');
  }

  const remaining = remainingSeconds(endAt, now);

  return (
    <section
      aria-label="Dinlenme zamanlayıcısı"
      className="mt-3 rounded-lg border border-border bg-surface p-4 sm:p-5"
    >
      <div className="flex items-center gap-2">
        <Clock3 aria-hidden="true" className="size-4 text-primary" />
        <h2 className="text-base font-semibold text-foreground">Dinlenme</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Sonraki set için dinlenme süreni seç.
      </p>
      <span aria-atomic="true" aria-live="polite" className="sr-only">
        {phase === 'finished' ? 'Dinlenme bitti' : ''}
      </span>

      {phase === 'running' ? (
        <>
          <p className="metric-number mt-5 text-center text-5xl font-semibold text-foreground">
            {formatCountdown(remaining)}
          </p>
          <div
            aria-label="Dinlenme ilerlemesi"
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={Math.round(progressPercent(startAt, endAt, now))}
            className="mt-4 h-2 overflow-hidden rounded-full bg-surface-strong"
            role="progressbar"
          >
            <div
              className="h-full origin-left rounded-full bg-primary motion-safe:transition-transform motion-safe:duration-300"
              style={{
                transform: `scaleX(${progressPercent(startAt, endAt, now) / 100})`,
              }}
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              onClick={() => setEndAt((current) => current + 15_000)}
              variant="secondary"
            >
              <Plus aria-hidden="true" className="size-4" />
              +15 sn
            </Button>
            <Button onClick={() => setPhase('skipped')} variant="secondary">
              <SkipForward aria-hidden="true" className="size-4" />
              Atla
            </Button>
          </div>
        </>
      ) : (
        <>
          <div
            className="mt-4 grid grid-cols-4 gap-2"
            role="group"
            aria-label="Dinlenme süresi"
          >
            {REST_PRESETS.map((preset) => (
              <Button
                aria-pressed={duration === preset}
                className="min-w-0 px-1 font-mono text-xs tabular-nums"
                key={preset}
                onClick={() => {
                  setDuration(preset);
                  setRestDuration(preset);
                }}
                variant={duration === preset ? 'primary' : 'secondary'}
              >
                {preset} sn
              </Button>
            ))}
          </div>
          <p className="mt-4 text-sm font-medium text-foreground">
            {phase === 'finished'
              ? 'Dinlenme bitti'
              : phase === 'skipped'
                ? 'Dinlenme atlandı'
                : 'Hazır olduğunda zamanlayıcıyı başlat.'}
          </p>
          <Button className="mt-3 w-full" onClick={start}>
            Dinlenmeyi başlat
          </Button>
        </>
      )}
    </section>
  );
}
