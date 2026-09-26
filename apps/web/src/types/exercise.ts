export interface MuscleReference {
  name: string;
  slug: string;
}

export interface ExerciseSummary {
  id: string;
  name: string;
  slug: string;
  equipment: string | null;
  muscleGroup: MuscleReference;
  isCustom: boolean;
}

export interface ExerciseDetail extends ExerciseSummary {
  instructions: string | null;
}

export interface ExerciseLogSet {
  setNumber: number;
  weightKg: string;
  reps: number;
}

export interface ExerciseLog {
  id: string;
  performedAt: string;
  sets: ExerciseLogSet[];
}

export interface ExerciseSetInput {
  weightKg: string;
  reps: number;
}
