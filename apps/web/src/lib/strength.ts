interface SetValues {
  weightKg: string;
  reps: number;
}

/** Epley estimate of the one-rep max: weight × (1 + reps / 30). */
export function estimateOneRepMax(weightKg: number, reps: number): number {
  if (reps <= 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

/** Best one-rep-max estimate across sets, rounded to one decimal. */
export function bestOneRepMax(sets: readonly SetValues[]): number {
  const best = sets.reduce(
    (max, set) =>
      Math.max(max, estimateOneRepMax(Number(set.weightKg), set.reps)),
    0,
  );
  return Math.round(best * 10) / 10;
}

/** Training volume: the sum of weight × reps. */
export function setVolume(sets: readonly SetValues[]): number {
  return sets.reduce((sum, set) => sum + Number(set.weightKg) * set.reps, 0);
}

/**
 * Fill opacity for a muscle region in the volume heat map. Untrained
 * regions stay unfilled; trained ones scale from a visible minimum.
 */
export function heatOpacity(volume: number, maxVolume: number): number {
  if (volume <= 0 || maxVolume <= 0) return 0;
  return 0.25 + 0.75 * Math.min(1, volume / maxVolume);
}
