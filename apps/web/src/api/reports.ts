import { authorizedRequest } from '@/lib/api';
import { scopedApiPath } from '@/lib/client-scope';
import type {
  ExerciseReport,
  ReportExerciseOption,
  ReportOverview,
  ReportRange,
} from '@/types/report';

export const reportKeys = {
  overview: ['reports', 'overview'] as const,
  exercises: ['reports', 'exercises'] as const,
  detail: (slug: string, isCustom: boolean, range: ReportRange) =>
    ['reports', 'detail', slug, isCustom, range] as const,
};

/** `clientId` reads a linked client's reports as their coach. */
export function getReportExercises(
  clientId?: string,
): Promise<ReportExerciseOption[]> {
  return authorizedRequest(scopedApiPath('/reports/exercises', clientId));
}

export function getExerciseReport(
  slug: string,
  isCustom: boolean,
  range: ReportRange,
  clientId?: string,
): Promise<ExerciseReport> {
  const query = new URLSearchParams({ range });
  const path = isCustom
    ? `/reports/exercises/custom/${encodeURIComponent(slug)}`
    : `/reports/exercises/${encodeURIComponent(slug)}`;
  return authorizedRequest(scopedApiPath(`${path}?${query}`, clientId));
}

export function getReportOverview(clientId?: string): Promise<ReportOverview> {
  // Days and weeks are counted in the viewer's local time.
  const offset = String(-new Date().getTimezoneOffset());
  return authorizedRequest(
    scopedApiPath(`/reports/overview?offset=${offset}`, clientId),
  );
}
