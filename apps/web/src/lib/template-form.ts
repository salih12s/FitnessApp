import { toKilograms } from './format';

/** A planned exercise as typed: the weight is in the user's display unit. */
export interface TemplateRowDraft {
  targetSets: string;
  targetReps: string;
  targetWeight: string;
}

export interface TemplateRowErrors {
  targetSets?: string;
  targetReps?: string;
  targetWeight?: string;
}

const wholeNumber = /^\d+$/;
const weight = /^(?:0|[1-9]\d{0,3})(?:[.,]\d{1,2})?$/;

function checkRange(value: string, min: number, max: number) {
  const trimmed = value.trim();
  return (
    wholeNumber.test(trimmed) &&
    Number(trimmed) >= min &&
    Number(trimmed) <= max
  );
}

/** Validates one planned exercise; the weight target is optional. */
export function validateTemplateRow(row: TemplateRowDraft): TemplateRowErrors {
  const errors: TemplateRowErrors = {};

  if (!checkRange(row.targetSets, 1, 20)) {
    errors.targetSets = 'Set sayısı 1 ile 20 arasında olmalı.';
  }
  if (!checkRange(row.targetReps, 1, 100)) {
    errors.targetReps = 'Tekrar 1 ile 100 arasında olmalı.';
  }
  const trimmedWeight = row.targetWeight.trim();
  if (trimmedWeight && !weight.test(trimmedWeight)) {
    errors.targetWeight = 'Ağırlık 0 ile 9999,99 arasında olmalı.';
  }

  return errors;
}

/** Converts the optional weight to the API's kilogram string or null. */
export function toTargetWeight(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? toKilograms(trimmed) : null;
}

interface PlannedTarget {
  targetSets: number;
  targetReps: number;
  targetWeightKg: string | null;
}

/**
 * Entry-form sets for a planned exercise. Without a weight target, the
 * heaviest set of the last workout is a sensible starting load.
 */
export function plannedSets(
  target: PlannedTarget,
  lastSets: readonly { weightKg: string }[] = [],
): { setNumber: number; weightKg: string; reps: number }[] {
  const lastTop = lastSets.reduce<string | null>(
    (top, set) =>
      top === null || Number(set.weightKg) > Number(top) ? set.weightKg : top,
    null,
  );
  const weightKg = target.targetWeightKg ?? lastTop ?? '';

  return Array.from({ length: target.targetSets }, (_, index) => ({
    setNumber: index + 1,
    weightKg,
    reps: target.targetReps,
  }));
}
