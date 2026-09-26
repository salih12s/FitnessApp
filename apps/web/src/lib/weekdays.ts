/** Weekdays in display order with their bit in a template's schedule mask. */
export const WEEKDAYS = [
  { bit: 1, short: 'Pzt', long: 'Pazartesi' },
  { bit: 2, short: 'Sal', long: 'Salı' },
  { bit: 4, short: 'Çar', long: 'Çarşamba' },
  { bit: 8, short: 'Per', long: 'Perşembe' },
  { bit: 16, short: 'Cum', long: 'Cuma' },
  { bit: 32, short: 'Cmt', long: 'Cumartesi' },
  { bit: 64, short: 'Paz', long: 'Pazar' },
] as const;

const ALL_DAYS = 127;

/** Schedule bit for a date's weekday (Monday = 1 ... Sunday = 64). */
export function weekdayBit(date: Date): number {
  // getDay() counts from Sunday = 0; the mask starts on Monday.
  return 1 << ((date.getDay() + 6) % 7);
}

export function isScheduledOn(mask: number, date: Date): boolean {
  return (mask & weekdayBit(date)) !== 0;
}

export function toggleWeekday(mask: number, bit: number): number {
  return mask ^ bit;
}

/** "Pzt, Çar, Cum", "Her gün", or "Gün seçilmedi". */
export function formatSchedule(mask: number): string {
  if (mask === 0) return 'Gün seçilmedi';
  if (mask === ALL_DAYS) return 'Her gün';
  return WEEKDAYS.filter((day) => mask & day.bit)
    .map((day) => day.short)
    .join(', ');
}
