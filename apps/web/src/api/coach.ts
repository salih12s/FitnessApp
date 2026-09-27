import { authorizedRequest } from '@/lib/api';
import type {
  ClientSummary,
  CoachStatus,
  InvitePreview,
  LinkedAccount,
} from '@/types/coach';
import type { WorkoutTemplate } from '@/types/template';

export const coachKeys = {
  status: ['coach', 'status'] as const,
  clients: ['coach', 'clients'] as const,
  client: (clientId: string) => ['coach', 'clients', clientId] as const,
  coaches: ['coaches'] as const,
  invite: (code: string) => ['coaches', 'invite', code] as const,
};

export function getCoachStatus(): Promise<CoachStatus> {
  return authorizedRequest('/coach');
}

export function setCoachMode(enabled: boolean): Promise<CoachStatus> {
  return authorizedRequest('/coach', {
    method: 'PUT',
    body: JSON.stringify({ enabled }),
  });
}

export function regenerateInviteCode(): Promise<CoachStatus> {
  return authorizedRequest('/coach/invite', { method: 'POST' });
}

export function getClients(): Promise<ClientSummary[]> {
  // Training days are counted in the viewer's local time.
  const offset = String(-new Date().getTimezoneOffset());
  return authorizedRequest(`/coach/clients?offset=${offset}`);
}

export function getClient(clientId: string): Promise<LinkedAccount> {
  return authorizedRequest(`/coach/clients/${encodeURIComponent(clientId)}`);
}

export function removeClient(clientId: string): Promise<void> {
  return authorizedRequest(`/coach/clients/${encodeURIComponent(clientId)}`, {
    method: 'DELETE',
  });
}

export function assignTemplate(
  clientId: string,
  templateId: string,
): Promise<WorkoutTemplate> {
  return authorizedRequest(
    `/coach/clients/${encodeURIComponent(clientId)}/templates`,
    { method: 'POST', body: JSON.stringify({ templateId }) },
  );
}

export function getCoaches(): Promise<LinkedAccount[]> {
  return authorizedRequest('/coaches');
}

export function previewInvite(code: string): Promise<InvitePreview> {
  return authorizedRequest(`/coaches/invites/${encodeURIComponent(code)}`);
}

export function acceptInvite(code: string): Promise<LinkedAccount> {
  return authorizedRequest('/coaches', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export function removeCoach(coachId: string): Promise<void> {
  return authorizedRequest(`/coaches/${encodeURIComponent(coachId)}`, {
    method: 'DELETE',
  });
}
