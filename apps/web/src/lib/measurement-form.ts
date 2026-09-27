import { getWeightUnit, toKilograms } from './format';
import type { BodyMeasurement, MeasurementInput } from '@/types/measurement';

/** A measurement as typed; body weight is in the user's display unit. */
export interface MeasurementDraft {
  measuredAt: string;
  weight: string;
  bodyFatPercent: string;
  waistCm: string;
  chestCm: string;
  armCm: string;
  note: string;
}

export type MeasurementErrors = Partial<
  Record<keyof MeasurementDraft | 'form', string>
>;

const weightPattern = /^(?:0|[1-9]\d{0,2})(?:[.,]\d{1,2})?$/;
const bodyFatPattern = /^(?:0|[1-9]\d?|100)(?:[.,]\d)?$/;
const lengthPattern = /^(?:0|[1-9]\d{0,2})(?:[.,]\d)?$/;
const lengthFields = ['waistCm', 'chestCm', 'armCm'] as const;

export function emptyMeasurementDraft(today: string): MeasurementDraft {
  return {
    measuredAt: today,
    weight: '',
    bodyFatPercent: '',
    waistCm: '',
    chestCm: '',
    armCm: '',
    note: '',
  };
}

export function validateMeasurement(
  draft: MeasurementDraft,
): MeasurementErrors {
  const errors: MeasurementErrors = {};
  const weight = draft.weight.trim();
  const bodyFat = draft.bodyFatPercent.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.measuredAt)) {
    errors.measuredAt = 'Bir tarih seç.';
  }
  if (weight && !weightPattern.test(weight)) {
    errors.weight = `0 ile 999,99 ${getWeightUnit()} arasında bir değer gir.`;
  } else if (weight && Number(toKilograms(weight)) > 999.99) {
    errors.weight = 'Bu değer kaydedilemeyecek kadar yüksek.';
  }
  if (bodyFat && (!bodyFatPattern.test(bodyFat) || parse(bodyFat) > 100)) {
    errors.bodyFatPercent = '0 ile 100 arasında, en fazla bir ondalık gir.';
  }
  for (const field of lengthFields) {
    const value = draft[field].trim();
    if (value && !lengthPattern.test(value)) {
      errors[field] = '0 ile 999,9 cm arasında bir değer gir.';
    }
  }
  if (draft.note.length > 1000) {
    errors.note = 'Not en fazla 1000 karakter olabilir.';
  }
  if (
    !weight &&
    !bodyFat &&
    lengthFields.every((field) => !draft[field].trim())
  ) {
    errors.form = 'En az bir ölçüm gir.';
  }

  return errors;
}

/** API body for a valid draft: kilograms and dot decimals, blanks as null. */
export function toMeasurementInput(draft: MeasurementDraft): MeasurementInput {
  const decimal = (value: string) =>
    value.trim() ? value.trim().replace(',', '.') : null;
  const weight = draft.weight.trim();

  return {
    measuredAt: draft.measuredAt,
    weightKg: weight ? toKilograms(weight) : null,
    bodyFatPercent: decimal(draft.bodyFatPercent),
    waistCm: decimal(draft.waistCm),
    chestCm: decimal(draft.chestCm),
    armCm: decimal(draft.armCm),
    note: draft.note.trim() || null,
  };
}

function parse(value: string): number {
  return Number(value.replace(',', '.'));
}

export type MeasurementMetric =
  'weightKg' | 'bodyFatPercent' | 'waistCm' | 'chestCm' | 'armCm';

/**
 * The most recent recorded value of each metric. Measurements arrive newest
 * first and often record only some metrics, so each one is looked up alone.
 */
export function latestMeasurementValues(
  measurements: readonly BodyMeasurement[],
): Record<MeasurementMetric, string | null> {
  const latest = (metric: MeasurementMetric) =>
    measurements.find((row) => row[metric] !== null)?.[metric] ?? null;

  return {
    weightKg: latest('weightKg'),
    bodyFatPercent: latest('bodyFatPercent'),
    waistCm: latest('waistCm'),
    chestCm: latest('chestCm'),
    armCm: latest('armCm'),
  };
}

/** Parses a `YYYY-MM-DD` calendar date at local midnight. */
export function parseCalendarDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}
