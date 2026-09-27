export type WeightUnit = 'kg' | 'lb';

export const KG_PER_LB = 0.45359237;

// Storage and the API always use kilograms. The signed-in user's display unit
// lives here so every weight shown or entered goes through one place.
let displayUnit: WeightUnit = 'kg';

export function setWeightUnit(unit: WeightUnit): void {
  displayUnit = unit;
}

export function getWeightUnit(): WeightUnit {
  return displayUnit;
}

const weightFormatter = new Intl.NumberFormat('tr-TR', {
  maximumFractionDigits: 2,
});

function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Converts kilograms to the display unit, rounded to 2 decimals. */
export function toDisplayWeight(
  kilograms: string | number,
  unit: WeightUnit = displayUnit,
): number {
  const value = Number(kilograms);
  return unit === 'kg' ? value : roundTo2(value / KG_PER_LB);
}

/**
 * Converts a value entered in the display unit ("176,37" lb) to the API's
 * dot-decimal kilogram string rounded to 2 decimals ("80").
 */
export function toKilograms(
  value: string | number,
  unit: WeightUnit = displayUnit,
): string {
  const amount = Number(String(value).trim().replace(',', '.'));
  return String(roundTo2(unit === 'kg' ? amount : amount * KG_PER_LB));
}

/** A kilogram value from the API as a dot-decimal input value in the display unit. */
export function toWeightInput(kilograms: string | number): string {
  return String(toDisplayWeight(kilograms));
}

/**
 * Formats a weight from the API (kilograms, a decimal string such as "87.5")
 * in the display unit with the Turkish decimal comma: "87,5".
 */
export function formatWeight(value: string | number): string {
  return weightFormatter.format(toDisplayWeight(value));
}

/** Formats a number that is already in the display unit, such as a chart value. */
export function formatDisplayWeight(value: number): string {
  return weightFormatter.format(value);
}

/** formatWeight followed by the unit: "87,5 kg" or "192,9 lb". */
export function formatWeightWithUnit(value: string | number): string {
  return `${formatWeight(value)} ${displayUnit}`;
}

/**
 * Training volume for compact tiles: the display unit below one thousand,
 * thousands with one decimal above it ("850 kg", "11 t", "12,4 bin lb").
 */
export function formatVolume(value: string | number): {
  value: string;
  unit: string;
} {
  const amount = toDisplayWeight(value);
  if (amount < 1000) {
    return {
      value: weightFormatter.format(Math.round(amount)),
      unit: displayUnit,
    };
  }
  return {
    value: new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 }).format(
      amount / 1000,
    ),
    unit: displayUnit === 'kg' ? 't' : 'bin lb',
  };
}

/** Like formatWeight, with an explicit plus sign for gains: "+2,5". */
export function formatWeightChange(value: string | number): string {
  const amount = Number(value);
  return `${amount > 0 ? '+' : ''}${formatWeight(amount)}`;
}
