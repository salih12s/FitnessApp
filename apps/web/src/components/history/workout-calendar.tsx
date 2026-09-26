import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { getCalendarMonth, getTemplates, templateKeys } from '@/api/templates';
import {
  useActiveSession,
  useStartSession,
} from '@/components/sessions/use-active-session';
import { Button } from '@/components/ui/button';
import { monthGrid, shiftMonth, toMonthKey } from '@/lib/calendar';
import { exercisePath } from '@/lib/exercise-path';
import { formatVolume } from '@/lib/format';
import { toDateKey } from '@/lib/history-groups';
import { cn } from '@/lib/utils';
import { isScheduledOn, WEEKDAYS } from '@/lib/weekdays';
import type { CalendarDaySummary, WorkoutTemplate } from '@/types/template';

const monthFormatter = new Intl.DateTimeFormat('tr-TR', {
  month: 'long',
  year: 'numeric',
});
const dayFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  weekday: 'long',
});

function SelectedDay({
  date,
  summary,
  planned,
  isToday,
}: {
  date: Date;
  summary?: CalendarDaySummary;
  planned: WorkoutTemplate[];
  isToday: boolean;
}) {
  const navigate = useNavigate();
  const { data: activeSession } = useActiveSession();
  const startMutation = useStartSession();
  const volume = summary ? formatVolume(summary.volumeKg) : null;

  return (
    <div className="mt-4 border-t border-border pt-4" aria-live="polite">
      <p className="text-sm font-semibold text-foreground">
        {dayFormatter.format(date)}
      </p>
      {summary && volume ? (
        <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">
          {summary.logCount} hareket
          {summary.sessionCount > 0
            ? ` · ${summary.sessionCount} antrenman`
            : ''}{' '}
          · {volume.value} {volume.unit} hacim
        </p>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">Kayıt yok.</p>
      )}

      {planned.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {planned.map((template) => (
            <li
              className="flex items-center justify-between gap-3 rounded-md bg-surface-strong px-3 py-2"
              key={template.id}
            >
              <span className="min-w-0">
                <span className="block text-[0.6875rem] text-muted-foreground">
                  Planlı program
                </span>
                <span className="block truncate text-sm font-medium text-foreground">
                  {template.name}
                </span>
              </span>
              {isToday && !activeSession ? (
                <Button
                  className="h-10 min-h-10 shrink-0 px-3"
                  disabled={startMutation.isPending}
                  onClick={() =>
                    startMutation.mutate(template.id, {
                      onSuccess: () =>
                        navigate(exercisePath(template.exercises[0].exercise)),
                    })
                  }
                >
                  <Play aria-hidden="true" className="size-4" />
                  Başlat
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * Month view of trained days (filled) and days a template is planned for
 * (outlined). Selecting a day shows its summary and planned programs.
 */
export function WorkoutCalendar() {
  const todayKey = toDateKey(new Date());
  const [month, setMonth] = useState(() => toMonthKey(new Date()));
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const calendarQuery = useQuery({
    queryKey: templateKeys.calendar(month),
    queryFn: () => getCalendarMonth(month),
    retry: 1,
  });
  const templatesQuery = useQuery({
    queryKey: templateKeys.all,
    queryFn: getTemplates,
    retry: 1,
  });

  const summaries = new Map(
    (calendarQuery.data?.days ?? []).map((day) => [day.date, day]),
  );
  const templates = templatesQuery.data ?? [];
  const weeks = monthGrid(month);
  const selected = weeks.flat().find((day) => day.key === selectedKey);
  const plannedFor = (date: Date, key: string) =>
    key >= todayKey
      ? templates.filter((template) =>
          isScheduledOn(template.scheduledDays, date),
        )
      : [];

  return (
    <section
      aria-label="Antrenman takvimi"
      className="rounded-lg border border-border bg-surface p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <Button
          aria-label="Önceki ay"
          className="size-10 min-h-10 text-muted-foreground"
          onClick={() => setMonth((current) => shiftMonth(current, -1))}
          size="icon"
          variant="ghost"
        >
          <ChevronLeft aria-hidden="true" className="size-5" />
        </Button>
        <h2 className="text-base font-semibold capitalize text-foreground">
          {monthFormatter.format(new Date(`${month}-15T12:00:00`))}
        </h2>
        <Button
          aria-label="Sonraki ay"
          className="size-10 min-h-10 text-muted-foreground"
          onClick={() => setMonth((current) => shiftMonth(current, 1))}
          size="icon"
          variant="ghost"
        >
          <ChevronRight aria-hidden="true" className="size-5" />
        </Button>
      </div>

      <div
        className={cn(
          'mt-3 grid grid-cols-7 gap-1 transition-opacity',
          calendarQuery.isFetching && !calendarQuery.data && 'opacity-50',
        )}
      >
        {WEEKDAYS.map((day) => (
          <span
            aria-hidden="true"
            className="pb-1 text-center text-[0.6875rem] text-muted-foreground"
            key={day.bit}
          >
            {day.short}
          </span>
        ))}
        {weeks.flat().map((day) => {
          const summary = summaries.get(day.key);
          const planned = plannedFor(day.date, day.key);
          const isToday = day.key === todayKey;
          const isSelected = day.key === selectedKey;
          const label = [
            dayFormatter.format(day.date),
            summary ? `${summary.logCount} hareket` : null,
            planned.length > 0
              ? `planlı: ${planned.map((template) => template.name).join(', ')}`
              : null,
          ]
            .filter(Boolean)
            .join(', ');

          return (
            <button
              aria-label={label}
              aria-pressed={isSelected}
              className={cn(
                'relative grid aspect-square min-h-10 cursor-pointer place-items-center rounded-md font-mono text-sm tabular-nums outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring',
                !day.inMonth && 'text-muted-foreground/50',
                day.inMonth && !summary && 'text-foreground',
                summary && 'bg-primary font-semibold text-primary-foreground',
                !summary &&
                  planned.length > 0 &&
                  'border border-dashed border-primary text-primary',
                !summary && isSelected && 'bg-surface-strong',
                isSelected && 'ring-2 ring-foreground/70',
              )}
              key={day.key}
              onClick={() => {
                setSelectedKey(day.key);
                if (!day.inMonth) setMonth(toMonthKey(day.date));
              }}
              type="button"
            >
              {day.date.getDate()}
              {isToday ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute bottom-1 size-1 rounded-full',
                    summary ? 'bg-primary-foreground' : 'bg-primary',
                  )}
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-3 rounded-sm bg-primary" />
          Antrenman yapıldı
        </span>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="size-3 rounded-sm border border-dashed border-primary"
          />
          Planlı
        </span>
      </div>

      {calendarQuery.isError ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          Takvim verisi alınamadı.
        </p>
      ) : null}

      {selected ? (
        <SelectedDay
          date={selected.date}
          isToday={selected.key === todayKey}
          planned={plannedFor(selected.date, selected.key)}
          summary={summaries.get(selected.key)}
        />
      ) : null}
    </section>
  );
}
