import { authorizedRequest } from '@/lib/api';
import type { BodyMeasurement, MeasurementInput } from '@/types/measurement';

export const measurementKeys = {
  all: ['measurements'] as const,
};

export function getMeasurements(): Promise<BodyMeasurement[]> {
  return authorizedRequest('/measurements');
}

export function createMeasurement(
  input: MeasurementInput,
): Promise<BodyMeasurement> {
  // The API treats omitted fields as empty; it rejects explicit nulls.
  const body = Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== null),
  );
  return authorizedRequest('/measurements', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function deleteMeasurement(id: string): Promise<void> {
  return authorizedRequest(`/measurements/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
