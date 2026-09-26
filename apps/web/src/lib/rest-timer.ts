export const REST_PRESETS = [60, 90, 120, 180] as const;
export const DEFAULT_REST_SECONDS = 90;

const storageKey = 'fitness-rest-seconds';

export function remainingSeconds(endAt: number, now: number): number {
  return Math.max(0, Math.ceil((endAt - now) / 1000));
}

export function progressPercent(
  startAt: number,
  endAt: number,
  now: number,
): number {
  if (endAt <= startAt) return 100;
  return Math.min(
    100,
    Math.max(0, ((now - startAt) / (endAt - startAt)) * 100),
  );
}

export function formatCountdown(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function getRestDuration(): number {
  try {
    const stored = Number(localStorage.getItem(storageKey));
    return (
      REST_PRESETS.find((preset) => preset === stored) ?? DEFAULT_REST_SECONDS
    );
  } catch {
    return DEFAULT_REST_SECONDS;
  }
}

export function setRestDuration(seconds: number): void {
  try {
    localStorage.setItem(storageKey, String(seconds));
  } catch {
    // The selection still lasts for this page view when storage is unavailable.
  }
}
