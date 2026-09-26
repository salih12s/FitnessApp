import { authorizedRequest } from '@/lib/api';
import type {
  CalendarMonth,
  TemplateInput,
  WorkoutTemplate,
} from '@/types/template';

export const templateKeys = {
  all: ['templates'] as const,
  calendar: (month: string) => ['calendar', month] as const,
};

export function getTemplates(): Promise<WorkoutTemplate[]> {
  return authorizedRequest('/templates');
}

export function createTemplate(input: TemplateInput): Promise<WorkoutTemplate> {
  return authorizedRequest('/templates', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateTemplate(
  id: string,
  input: TemplateInput,
): Promise<WorkoutTemplate> {
  return authorizedRequest(`/templates/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function deleteTemplate(id: string): Promise<void> {
  return authorizedRequest(`/templates/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function getCalendarMonth(month: string): Promise<CalendarMonth> {
  // Days are grouped in the viewer's local time.
  const offset = String(-new Date().getTimezoneOffset());
  return authorizedRequest(
    `/reports/calendar?month=${encodeURIComponent(month)}&offset=${offset}`,
  );
}
