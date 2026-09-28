import { ApiError, apiRequest } from '@/lib/api';

import type { AuthCredentials, AuthSession } from './auth-types';

export function loginRequest(
  credentials: AuthCredentials,
): Promise<AuthSession> {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

export function registerRequest(
  credentials: AuthCredentials,
): Promise<AuthSession> {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

/** Creates a private sample account filled with data and signs in to it. */
export function demoRequest(): Promise<AuthSession> {
  return apiRequest('/auth/demo', { method: 'POST' });
}

let pendingRefresh: Promise<AuthSession> | null = null;

export function refreshRequest(): Promise<AuthSession> {
  pendingRefresh ??= apiRequest<AuthSession>('/auth/refresh', {
    method: 'POST',
  }).finally(() => {
    pendingRefresh = null;
  });

  return pendingRefresh;
}

export function logoutRequest(): Promise<void> {
  return apiRequest('/auth/logout', { method: 'POST' });
}

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return 'Kullanıcı adı veya şifre hatalı.';
    }

    if (error.status === 409) {
      return 'Bu kullanıcı adı zaten alınmış.';
    }

    return error.message;
  }

  return 'Sunucuya ulaşılamadı. Lütfen tekrar dene.';
}
