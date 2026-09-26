const weightFormatter = new Intl.NumberFormat('tr-TR', {
  maximumFractionDigits: 2,
});

/**
 * Formats a weight from the API (a decimal string such as "87.5") with the
 * Turkish decimal comma, matching what number inputs show: "87,5".
 */
export function formatWeight(value: string | number): string {
  return weightFormatter.format(Number(value));
}

/**
 * Training volume for compact tiles: kilograms below one tonne, tonnes with
 * one decimal above it ("850 kg", "11 t", "12,4 t").
 */
export function formatVolume(value: string | number): {
  value: string;
  unit: 'kg' | 't';
} {
  const kilograms = Number(value);
  if (kilograms < 1000) {
    return { value: formatWeight(Math.round(kilograms)), unit: 'kg' };
  }
  return {
    value: new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 }).format(
      kilograms / 1000,
    ),
    unit: 't',
  };
}

/** Like formatWeight, with an explicit plus sign for gains: "+2,5". */
export function formatWeightChange(value: string | number): string {
  const amount = Number(value);
  return `${amount > 0 ? '+' : ''}${formatWeight(amount)}`;
}
