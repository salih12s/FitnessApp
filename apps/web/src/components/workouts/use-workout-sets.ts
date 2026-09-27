import { useRef, useState } from 'react';

import { toKilograms, toWeightInput } from '@/lib/format';
import {
  validateWorkoutSets,
  type WorkoutSetDraft,
  type WorkoutSetErrors,
} from '@/lib/workout-validation';
import type { ExerciseLogSet, ExerciseSetInput } from '@/types/exercise';

interface EditableSet extends WorkoutSetDraft {
  id: number;
}

export function useWorkoutSets(initialSets?: ExerciseLogSet[]) {
  const nextId = useRef(Math.max(1, initialSets?.length ?? 0) + 1);
  const [sets, setSets] = useState<EditableSet[]>(() =>
    initialSets?.length
      ? initialSets.map((set, index) => ({
          id: index + 1,
          weight: toWeightInput(set.weightKg),
          reps: String(set.reps),
        }))
      : [{ id: 1, weight: '', reps: '' }],
  );
  const [errors, setErrors] = useState<Record<number, WorkoutSetErrors>>({});

  function reset(source?: ExerciseLogSet[]) {
    setSets(
      source?.length
        ? source.map((set) => ({
            id: nextId.current++,
            weight: toWeightInput(set.weightKg),
            reps: String(set.reps),
          }))
        : [{ id: nextId.current++, weight: '', reps: '' }],
    );
    setErrors({});
  }

  function update(id: number, field: 'weight' | 'reps', value: string) {
    setSets((current) =>
      current.map((set) => (set.id === id ? { ...set, [field]: value } : set)),
    );
    setErrors((current) => ({
      ...current,
      [id]: { ...current[id], [field]: undefined },
    }));
  }

  function add() {
    setSets((current) => [
      ...current,
      { id: nextId.current++, weight: '', reps: '' },
    ]);
  }

  function remove(id: number) {
    setSets((current) => current.filter((set) => set.id !== id));
    setErrors((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  function validatedInput(): ExerciseSetInput[] | null {
    const nextErrors = validateWorkoutSets(sets);
    setErrors(nextErrors);
    return Object.keys(nextErrors).length
      ? null
      : sets.map((set) => ({
          weightKg: toKilograms(set.weight),
          reps: Number(set.reps),
        }));
  }

  return { sets, errors, reset, update, add, remove, validatedInput };
}
