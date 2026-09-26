export interface WorkoutSetDraft {
  weightKg: string;
  reps: string;
}

export interface WorkoutSetErrors {
  weightKg?: string;
  reps?: string;
}

const weightPattern = /^(?:0|[1-9]\d{0,3})(?:\.\d{1,2})?$/;

export function validateWorkoutSet(set: WorkoutSetDraft): WorkoutSetErrors {
  const errors: WorkoutSetErrors = {};

  if (!weightPattern.test(set.weightKg.trim())) {
    errors.weightKg = '0 ile 9999,99 kg arasında bir değer gir.';
  }

  const reps = Number(set.reps);
  if (!/^\d+$/.test(set.reps) || reps < 1 || reps > 1000) {
    errors.reps = '1 ile 1000 arasında tekrar gir.';
  }

  return errors;
}

export function validateWorkoutSets(
  sets: (WorkoutSetDraft & { id: number })[],
): Record<number, WorkoutSetErrors> {
  return Object.fromEntries(
    sets
      .map((set) => [set.id, validateWorkoutSet(set)] as const)
      .filter(([, errors]) => Object.keys(errors).length > 0),
  );
}
