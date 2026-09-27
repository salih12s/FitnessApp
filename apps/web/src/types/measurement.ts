/** One body measurement; values are decimal strings in kg, % and cm. */
export interface BodyMeasurement {
  id: string;
  /** Calendar date, `YYYY-MM-DD`. */
  measuredAt: string;
  weightKg: string | null;
  bodyFatPercent: string | null;
  waistCm: string | null;
  chestCm: string | null;
  armCm: string | null;
  note: string | null;
}

export type MeasurementInput = Omit<BodyMeasurement, 'id'>;
