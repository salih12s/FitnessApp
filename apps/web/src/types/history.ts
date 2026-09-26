import type { ExerciseLogSet, MuscleReference } from './exercise';

export interface HistoryExercise {
  name: string;
  slug: string;
  muscleGroup: MuscleReference;
  isCustom: boolean;
}

export interface HistoryLog {
  id: string;
  performedAt: string;
  sets: ExerciseLogSet[];
  exercise: HistoryExercise;
}

export interface HistoryPage {
  items: HistoryLog[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
}
