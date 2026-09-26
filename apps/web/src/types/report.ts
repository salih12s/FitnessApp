export type ReportRange = '30d' | '3m' | '6m' | 'all';

export interface ReportExerciseOption {
  id: string;
  name: string;
  slug: string;
  muscleGroup: { name: string; slug: string };
  isCustom: boolean;
  latestPerformedAt: string;
}

export interface ReportPointSet {
  id: string;
  setNumber: number;
  weightKg: string;
  reps: number;
}

export interface ReportPoint {
  id: string;
  performedAt: string;
  maxWeightKg: string;
  sets: ReportPointSet[];
}

export interface ExerciseReport {
  exercise: {
    name: string;
    slug: string;
    muscleGroup: { name: string; slug: string };
    isCustom: boolean;
  };
  summary: {
    startingWeightKg: string;
    currentWeightKg: string;
    personalRecordKg: string;
    increaseKg: string;
    improvementPercentage: number | null;
  } | null;
  points: ReportPoint[];
}

export interface MuscleGroupVolume {
  name: string;
  slug: string;
  volumeKg: string;
  setCount: number;
}

export interface PersonalRecordEvent {
  exercise: { name: string; slug: string; isCustom: boolean };
  weightKg: string;
  reps: number;
  previousKg: string;
  performedAt: string;
}

export interface ReportOverview {
  last7Days: {
    workoutDays: number;
    setCount: number;
    volumeKg: string;
    previousVolumeKg: string;
  };
  /** Consecutive Monday-based weeks with at least one workout. */
  streakWeeks: number;
  muscleGroups: MuscleGroupVolume[];
  recentRecords: PersonalRecordEvent[];
}
