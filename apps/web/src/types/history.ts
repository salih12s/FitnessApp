import type { ExerciseLog, MuscleReference } from './exercise';
import type { HistorySession } from './session';

export interface HistoryExercise {
  name: string;
  slug: string;
  muscleGroup: MuscleReference;
  isCustom: boolean;
}

export interface HistoryLog extends ExerciseLog {
  exercise: HistoryExercise;
  session: HistorySession | null;
}

export interface HistoryPage {
  items: HistoryLog[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
}
