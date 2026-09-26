const API_URL = (
  import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api'
).replace(/\/$/, '');

interface ApiErrorBody {
  message?: string | string[];
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiAuth {
  getAccessToken: () => string | null;
  /** Resolves to a fresh access token, or null when the session has ended. */
  refreshAccessToken: () => Promise<string | null>;
}

let apiAuth: ApiAuth | null = null;

export function setApiAuth(auth: ApiAuth | null): void {
  apiAuth = auth;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
    const message = Array.isArray(body.message)
      ? body.message.join(' ')
      : body.message;

    throw new ApiError(message ?? 'İşlem tamamlanamadı.', response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function withAccessToken(init: RequestInit, accessToken: string | null) {
  return accessToken
    ? {
        ...init,
        headers: { ...init.headers, Authorization: `Bearer ${accessToken}` },
      }
    : init;
}

/**
 * Sends a request with the current access token. On a 401 the token is
 * refreshed once and the request is retried.
 */
export async function authorizedRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const accessToken = apiAuth?.getAccessToken() ?? null;

  try {
    return await apiRequest<T>(path, withAccessToken(init, accessToken));
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 401) || !apiAuth) {
      throw error;
    }

    // Another request may already have refreshed the token.
    const currentToken = apiAuth.getAccessToken();
    const nextToken =
      currentToken && currentToken !== accessToken
        ? currentToken
        : await apiAuth.refreshAccessToken();

    if (!nextToken) {
      throw error;
    }

    return apiRequest<T>(path, withAccessToken(init, nextToken));
  }
}
