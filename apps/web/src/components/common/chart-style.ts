/** Mono axis labels in the secondary text color, shared by every chart. */
/**
 * Y-axis width that fits the longest tick label ("4.439" for volume), so
 * large values are not clipped. Mono digits are about 7px at 11px size.
 */
export function yAxisWidth(values: readonly number[]): number {
  const longest = Math.max(
    0,
    ...values.map((value) => Math.round(value).toLocaleString('tr-TR').length),
  );
  return Math.max(32, longest * 7 + 10);
}

export const chartTick = {
  fill: 'var(--text-secondary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
};
