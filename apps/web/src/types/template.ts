import type { MuscleReference } from './exercise';

export interface TemplateExercise {
  position: number;
  exercise: {
    id: string;
    name: string;
    slug: string;
    isCustom: boolean;
    muscleGroup: MuscleReference;
  };
  targetSets: number;
  targetReps: number;
  targetWeightKg: string | null;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  /** Weekday bitmask: Monday = 1 ... Sunday = 64. */
  scheduledDays: number;
  lastUsedAt: string | null;
  exercises: TemplateExercise[];
}

export interface TemplateInput {
  name: string;
  scheduledDays: number;
  exercises: {
    exerciseId: string;
    targetSets: number;
    targetReps: number;
    targetWeightKg: string | null;
  }[];
}

export interface CalendarDaySummary {
  date: string;
  logCount: number;
  sessionCount: number;
  volumeKg: string;
}

export interface CalendarMonth {
  month: string;
  days: CalendarDaySummary[];
}
