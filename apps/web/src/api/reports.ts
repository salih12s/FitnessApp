import { authorizedRequest } from '@/lib/api';
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

export function getReportExercises(): Promise<ReportExerciseOption[]> {
  return authorizedRequest('/reports/exercises');
}

export function getExerciseReport(
  slug: string,
  isCustom: boolean,
  range: ReportRange,
): Promise<ExerciseReport> {
  const query = new URLSearchParams({ range });
  const path = isCustom
    ? `/reports/exercises/custom/${encodeURIComponent(slug)}`
    : `/reports/exercises/${encodeURIComponent(slug)}`;
  return authorizedRequest(`${path}?${query}`);
}

export function getReportOverview(): Promise<ReportOverview> {
  // Days and weeks are counted in the viewer's local time.
  const offset = String(-new Date().getTimezoneOffset());
  return authorizedRequest(`/reports/overview?offset=${offset}`);
}
