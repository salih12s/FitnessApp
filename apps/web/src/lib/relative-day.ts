const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
});

function startOfDay(date: Date): number {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
}

/**
 * A past moment in calendar days from today, in the viewer's time zone:
 * "bugün", "dün", "3 gün önce", then the date after two weeks ("4 Eyl").
 */
export function formatRelativeDay(value: string, now = new Date()): string {
  const date = new Date(value);
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);

  if (days <= 0) return 'bugün';
  if (days === 1) return 'dün';
  if (days < 14) return `${days} gün önce`;
  return dateFormatter.format(date);
}
