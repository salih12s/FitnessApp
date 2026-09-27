import { createContext, useContext } from 'react';

/**
 * A coach viewing a linked client. Pages rendered inside the client
 * workspace read this to send their requests to the client endpoints, keep
 * links inside the workspace, and hide features that only make sense for the
 * signed-in user's own data.
 */
export interface ClientScope {
  clientId: string;
  username: string;
}

export const ClientScopeContext = createContext<ClientScope | null>(null);

export function useClientScope(): ClientScope | null {
  return useContext(ClientScopeContext);
}

/**
 * The API path for the signed-in user's data, or the same path under the
 * coach's client endpoints: `/history` -> `/coach/clients/<id>/history`.
 */
export function scopedApiPath(path: string, clientId?: string | null): string {
  return clientId
    ? `/coach/clients/${encodeURIComponent(clientId)}${path}`
    : path;
}

/**
 * An app route for the current scope: `/app/exercises/x` stays as is for the
 * user's own pages and becomes `/app/clients/<id>/exercises/x` for a client.
 */
export function scopedAppPath(path: string, clientId?: string | null): string {
  if (!clientId) return path;
  const base = `/app/clients/${encodeURIComponent(clientId)}`;
  if (path === '/app') return base;
  return path.startsWith('/app/') ? `${base}/${path.slice(5)}` : path;
}

export function useScopedAppPath(): (path: string) => string {
  const scope = useClientScope();
  return (path) => scopedAppPath(path, scope?.clientId);
}
