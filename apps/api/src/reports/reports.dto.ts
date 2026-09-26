import { IsIn, IsOptional } from 'class-validator';

export const reportRanges = ['30d', '3m', '6m', 'all'] as const;
export type ReportRange = (typeof reportRanges)[number];

export class ReportQueryDto {
  @IsOptional()
  @IsIn(reportRanges)
  range: ReportRange = 'all';
}
