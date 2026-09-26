import { toDateKey } from '@/lib/history-groups';

export interface CalendarDay {
  date: Date;
  /** Local YYYY-MM-DD, matching the calendar API's day keys. */
  key: string;
  inMonth: boolean;
}

/** YYYY-MM for a local date. */
export function toMonthKey(date: Date): string {
  return toDateKey(date).slice(0, 7);
}

export function shiftMonth(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split('-').map(Number);
  return toMonthKey(new Date(year, month - 1 + delta, 1));
}

/**
 * Monday-first weeks covering the month, padded with the neighbouring
 * months' days so every week has seven cells.
 */
export function monthGrid(monthKey: string): CalendarDay[][] {
  const [year, month] = monthKey.split('-').map(Number);
  const first = new Date(year, month - 1, 1);
  const leading = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();
  const weekCount = Math.ceil((leading + daysInMonth) / 7);

  return Array.from({ length: weekCount }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday) => {
      const date = new Date(year, month - 1, 1 - leading + week * 7 + weekday);
      return {
        date,
        key: toDateKey(date),
        inMonth: date.getMonth() === month - 1,
      };
    }),
  );
}
