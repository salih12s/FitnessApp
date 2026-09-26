export interface WorkoutSession {
  id: string;
  startedAt: string;
  endedAt: string | null;
  note: string | null;
  exerciseCount: number;
  setCount: number;
  /** Sum of weight × reps as a decimal string, like other weights. */
  totalVolumeKg: string;
}

/** The session fields embedded in each history log. */
export interface HistorySession {
  id: string;
  startedAt: string;
  endedAt: string | null;
  note: string | null;
}
