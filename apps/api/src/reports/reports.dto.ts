import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export const reportRanges = ['30d', '3m', '6m', 'all'] as const;
export type ReportRange = (typeof reportRanges)[number];

export class ReportQueryDto {
  @IsOptional()
  @IsIn(reportRanges)
  range: ReportRange = 'all';
}

export class OverviewQueryDto {
  /** The client's UTC offset in minutes (east positive), e.g. 180. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-840)
  @Max(840)
  offset: number = 0;
}
