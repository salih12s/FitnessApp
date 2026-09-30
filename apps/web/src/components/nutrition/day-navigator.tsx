import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef } from 'react';

import { Button } from '@/components/ui/button';
import { addDays, formatDayLabel, isDateKey } from '@/lib/nutrition';

interface DayNavigatorProps {
  date: string;
  todayKey: string;
  onChange: (date: string) => void;
}

/** Previous and next day buttons around the day's name, which opens a date picker. */
export function DayNavigator({ date, todayKey, onChange }: DayNavigatorProps) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const { title, subtitle } = formatDayLabel(date, todayKey);

  return (
    <div className="flex items-center gap-2">
      <Button
        aria-label="Önceki gün"
        onClick={() => onChange(addDays(date, -1))}
        size="icon"
        variant="secondary"
      >
        <ChevronLeft aria-hidden="true" className="size-5" />
      </Button>

      <button
        aria-label={`${title}, ${subtitle}. Tarih seç`}
        className="relative flex min-h-12 min-w-0 flex-1 cursor-pointer items-center justify-center gap-3 rounded-md border border-border-strong bg-surface px-4 text-left shadow-[0_1px_2px_var(--shadow-tint)] outline-none transition-[background-color,transform] duration-200 hover:bg-surface-elevated focus-visible:ring-3 focus-visible:ring-ring active:scale-[0.99] sm:flex-none sm:justify-start sm:pr-6"
        onClick={() => pickerRef.current?.showPicker?.()}
        type="button"
      >
        <CalendarDays
          aria-hidden="true"
          className="size-5 shrink-0 text-muted-foreground"
        />
        <span className="min-w-0">
          <span className="block truncate text-[0.9375rem] font-semibold leading-5 text-foreground">
            {title}
          </span>
          <span className="block truncate text-xs leading-4 text-muted-foreground">
            {subtitle}
          </span>
        </span>
        <input
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0"
          onChange={(event) => {
            if (isDateKey(event.target.value)) onChange(event.target.value);
          }}
          ref={pickerRef}
          tabIndex={-1}
          type="date"
          value={date}
        />
      </button>

      <Button
        aria-label="Sonraki gün"
        onClick={() => onChange(addDays(date, 1))}
        size="icon"
        variant="secondary"
      >
        <ChevronRight aria-hidden="true" className="size-5" />
      </Button>

      {date !== todayKey ? (
        <Button onClick={() => onChange(todayKey)} variant="ghost">
          Bugün
        </Button>
      ) : null}
    </div>
  );
}
