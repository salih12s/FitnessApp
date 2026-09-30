import * as m from 'motion/react-m';
import { Pencil, Target } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  calorieProgress,
  formatCalories,
  formatGrams,
  macroRatio,
  macroShares,
} from '@/lib/nutrition';
import type { Macros, NutritionGoal } from '@/types/nutrition';

interface NutritionSummaryProps {
  totals: Macros;
  goal: NutritionGoal | null;
  onEditGoal: () => void;
}

const RING_SIZE = 168;
const RING_STROKE = 12;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;

function CalorieRing({
  consumed,
  goal,
}: {
  consumed: number;
  goal: NutritionGoal | null;
}) {
  const progress = calorieProgress(consumed, goal?.calories);

  return (
    <div
      aria-label={
        progress
          ? `${formatCalories(consumed)} kcal alındı, hedef ${formatCalories(goal?.calories ?? 0)} kcal`
          : `${formatCalories(consumed)} kcal alındı`
      }
      className="relative mx-auto size-42 shrink-0 sm:mx-0"
      role="img"
    >
      <svg
        aria-hidden="true"
        className="size-full -rotate-90"
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
      >
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          fill="none"
          r={RING_RADIUS}
          stroke="var(--surface-strong)"
          strokeWidth={RING_STROKE}
        />
        <m.circle
          animate={{ pathLength: progress?.ratio ?? 0 }}
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          fill="none"
          initial={{ pathLength: 0 }}
          r={RING_RADIUS}
          stroke={progress?.isOver ? 'var(--destructive)' : 'var(--primary)'}
          strokeLinecap="round"
          strokeWidth={RING_STROKE}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>

      <div className="absolute inset-0 grid place-content-center text-center">
        <p className="metric-number text-4xl font-semibold leading-none text-foreground">
          {formatCalories(consumed)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">kcal alındı</p>
        {progress ? (
          <p
            className={
              progress.isOver
                ? 'metric-number mt-2 text-xs font-semibold text-destructive'
                : 'metric-number mt-2 text-xs font-semibold text-primary'
            }
          >
            {progress.isOver
              ? `${formatCalories(-progress.remaining)} kcal fazla`
              : `${formatCalories(progress.remaining)} kcal kaldı`}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function MacroRow({
  label,
  consumed,
  target,
}: {
  label: string;
  consumed: number;
  target: number | null;
}) {
  const ratio = macroRatio(consumed, target);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="metric-number font-semibold text-foreground">
          {formatGrams(consumed)}
          {target ? (
            <span className="font-normal text-muted-foreground">
              {' '}
              / {formatGrams(target)}
            </span>
          ) : null}
          <span className="ml-0.5 text-xs font-normal text-muted-foreground">
            g
          </span>
        </span>
      </div>
      {ratio !== null ? (
        <div
          aria-hidden="true"
          className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-strong"
        >
          <m.div
            animate={{ scaleX: ratio }}
            className="h-full origin-left rounded-full bg-primary"
            initial={{ scaleX: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      ) : null}
    </div>
  );
}

/** The day at a glance: calorie ring, macros against their targets, and the macro split. */
export function NutritionSummary({
  totals,
  goal,
  onEditGoal,
}: NutritionSummaryProps) {
  const shares = macroShares(totals);

  return (
    <section
      aria-label="Günün özeti"
      className="animate-rise rounded-lg border border-border bg-surface p-4 sm:p-5"
    >
      <div className="grid gap-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-8">
        <CalorieRing consumed={totals.calories} goal={goal} />

        <div className="min-w-0 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">Makrolar</p>
            {goal ? (
              <Button
                className="h-9 min-h-9 px-3 text-xs"
                onClick={onEditGoal}
                variant="ghost"
              >
                <Pencil aria-hidden="true" className="size-3.5" />
                Hedefi düzenle
              </Button>
            ) : (
              <Button
                className="h-9 min-h-9 px-3 text-xs"
                onClick={onEditGoal}
                variant="secondary"
              >
                <Target aria-hidden="true" className="size-3.5" />
                Günlük hedef belirle
              </Button>
            )}
          </div>

          <MacroRow
            consumed={totals.proteinG}
            label="Protein"
            target={goal?.proteinG ?? null}
          />
          <MacroRow
            consumed={totals.carbsG}
            label="Karbonhidrat"
            target={goal?.carbsG ?? null}
          />
          <MacroRow
            consumed={totals.fatG}
            label="Yağ"
            target={goal?.fatG ?? null}
          />

          {shares ? (
            <div>
              <div
                aria-hidden="true"
                className="flex h-2 overflow-hidden rounded-full bg-surface-strong"
              >
                <div
                  className="h-full bg-primary"
                  style={{ width: `${shares.protein}%` }}
                />
                <div
                  className="h-full bg-primary/55"
                  style={{ width: `${shares.carbs}%` }}
                />
                <div
                  className="h-full bg-primary/25"
                  style={{ width: `${shares.fat}%` }}
                />
              </div>
              <p className="metric-number mt-2 text-xs text-muted-foreground">
                Kalorinin %{shares.protein} proteinden, %{shares.carbs}{' '}
                karbonhidrattan, %{shares.fat} yağdan
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
