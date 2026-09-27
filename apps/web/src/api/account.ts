import type { AuthUser } from '@/auth/auth-types';
import { authorizedBlob, authorizedRequest } from '@/lib/api';
import type { WeightUnit } from '@/lib/format';

export const accountKeys = {
  otherSessions: ['account', 'other-sessions'] as const,
};

export async function getOtherSessionCount(): Promise<number> {
  const response = await authorizedRequest<{ otherSessions: number }>(
    '/auth/sessions/count',
  );
  return response.otherSessions;
}

export function logoutOtherDevices(): Promise<void> {
  return authorizedRequest('/auth/logout-others', { method: 'POST' });
}

export function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  return authorizedRequest('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export function updateWeightUnit(weightUnit: WeightUnit): Promise<AuthUser> {
  return authorizedRequest('/users/me/preferences', {
    method: 'PATCH',
    body: JSON.stringify({ weightUnit }),
  });
}

export function deleteAccount(
  password: string,
  confirmation: string,
): Promise<void> {
  return authorizedRequest('/users/me', {
    method: 'DELETE',
    body: JSON.stringify({ password, confirmation }),
  });
}

/** Downloads every logged set as a CSV file through a temporary blob URL. */
export async function downloadLogsCsv(): Promise<void> {
  const blob = await authorizedBlob('/export/logs.csv');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `fitnessapp-antrenmanlar-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  // Revoke after the click has been handled so the download is not cancelled.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
