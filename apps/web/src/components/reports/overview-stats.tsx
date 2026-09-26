import { formatVolume } from '@/lib/format';
import type { ReportOverview } from '@/types/report';

function StatTile({
  label,
  value,
  unit,
  hint,
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-surface p-3 sm:p-4">
      <p className="truncate text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 flex items-baseline gap-1">
        <span className="metric-number truncate text-xl font-semibold text-foreground sm:text-2xl">
          {value}
        </span>
        {unit ? (
          <span className="text-xs text-muted-foreground">{unit}</span>
        ) : null}
      </p>
      {hint ? (
        <p className="mt-0.5 truncate font-mono text-[0.6875rem] tabular-nums text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function volumeChange(current: string, previous: string): string | undefined {
  const before = Number(previous);
  if (before <= 0) return undefined;
  const change = Math.round(((Number(current) - before) / before) * 100);
  return `${change > 0 ? '+' : ''}${change}% değişim`;
}

/** Last-7-days summary: training days, volume, and the weekly streak. */
export function OverviewStats({ overview }: { overview: ReportOverview }) {
  const { last7Days, streakWeeks } = overview;
  const volume = formatVolume(last7Days.volumeKg);

  return (
    <div className="grid grid-cols-3 gap-2">
      <StatTile
        hint="son 7 gün"
        label="Antrenman"
        unit="gün"
        value={String(last7Days.workoutDays)}
      />
      <StatTile
        hint={volumeChange(last7Days.volumeKg, last7Days.previousVolumeKg)}
        label="Hacim"
        unit={volume.unit}
        value={volume.value}
      />
      <StatTile
        hint="üst üste"
        label="Seri"
        unit="hafta"
        value={String(streakWeeks)}
      />
    </div>
  );
}
