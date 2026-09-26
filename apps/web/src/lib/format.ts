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

/** Like formatWeight, with an explicit plus sign for gains: "+2,5". */
export function formatWeightChange(value: string | number): string {
  const amount = Number(value);
  return `${amount > 0 ? '+' : ''}${formatWeight(amount)}`;
}
