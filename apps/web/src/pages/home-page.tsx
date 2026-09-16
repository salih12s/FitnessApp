import {
  ArrowRight,
  ChartNoAxesCombined,
  Clock3,
  TrendingUp,
} from 'lucide-react';

import { Button } from '@/components/ui/button';

const previewMetrics = [
  { label: 'Workouts', value: '24', icon: Clock3 },
  { label: 'Volume', value: '12.8k', icon: ChartNoAxesCombined },
  { label: 'Progress', value: '+18%', icon: TrendingUp },
];

export function HomePage() {
  return (
    <section className="mx-auto grid min-h-[calc(100svh-76px)] w-full max-w-6xl grid-cols-1 items-center gap-12 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-20 lg:px-10 lg:py-20">
      <div className="min-w-0 max-w-2xl">
        <p className="mb-5 text-xs font-bold uppercase tracking-[0.22em] text-primary sm:text-sm">
          Built for consistency
        </p>
        <h1 className="text-balance text-[clamp(2.75rem,11vw,5.75rem)] font-black leading-[0.92] tracking-[-0.065em] text-foreground">
          Track your strength.
          <span className="mt-2 block text-muted-foreground">
            See your progress.
          </span>
        </h1>
        <p className="mt-7 max-w-lg text-base leading-7 text-muted-foreground sm:mt-8 sm:text-lg sm:leading-8">
          A focused training log designed to make every set count and every gain
          visible.
        </p>
        <Button className="mt-8 w-full sm:mt-10 sm:w-auto" size="lg">
          Get Started
          <ArrowRight aria-hidden="true" className="size-4" strokeWidth={2.5} />
        </Button>
      </div>

      <div className="relative mx-auto min-w-0 w-full max-w-md lg:max-w-none">
        <div
          aria-hidden="true"
          className="absolute -inset-8 -z-10 rounded-full bg-primary/5 blur-3xl"
        />
        <div className="rounded-lg border border-border bg-surface p-4 sm:p-5">
          <div className="mb-8 flex items-center justify-between border-b border-border pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Weekly overview
              </p>
              <p className="mt-1 text-lg font-bold tracking-tight text-foreground">
                Stronger than last week
              </p>
            </div>
            <span className="size-2.5 rounded-full bg-primary shadow-[0_0_0_5px_color-mix(in_oklch,var(--primary)_12%,transparent)]" />
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {previewMetrics.map(({ label, value, icon: Icon }) => (
              <div
                className="min-w-0 rounded-md border border-border bg-surface-elevated p-3 sm:p-4"
                key={label}
              >
                <Icon aria-hidden="true" className="mb-5 size-4 text-primary" />
                <p className="truncate text-lg font-black tracking-[-0.04em] text-foreground sm:text-2xl">
                  {value}
                </p>
                <p className="mt-1 truncate text-[0.6875rem] font-medium text-muted-foreground sm:text-xs">
                  {label}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex h-28 items-end gap-2 rounded-md border border-border bg-surface-elevated p-4 sm:h-36">
            {[38, 52, 44, 70, 62, 84, 96].map((height, index) => (
              <div
                className="flex-1 rounded-sm bg-primary/20 last:bg-primary"
                key={`${height}-${index}`}
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
