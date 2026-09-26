// Weights are DECIMAL(6,2); integer hundredths keep sums and comparisons exact.

export function toCents(value: { toString(): string }): bigint {
  const [whole, fraction = ''] = value.toString().split('.');
  return BigInt(whole) * 100n + BigInt((fraction + '00').slice(0, 2));
}

export function formatCents(value: bigint): string {
  const sign = value < 0n ? '-' : '';
  const absolute = value < 0n ? -value : value;
  const whole = absolute / 100n;
  const fraction = absolute % 100n;
  if (fraction === 0n) return `${sign}${whole}`;
  return `${sign}${whole}.${fraction.toString().padStart(2, '0').replace(/0+$/, '')}`;
}

/** Sum of weight × reps in hundredths of a kilogram. */
export function volumeCents(
  sets: readonly { weightKg: { toString(): string }; reps: number }[],
): bigint {
  return sets.reduce(
    (sum, set) => sum + toCents(set.weightKg) * BigInt(set.reps),
    0n,
  );
}
