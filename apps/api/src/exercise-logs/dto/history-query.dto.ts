import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
} from 'class-validator';

const normalizeSlug = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

const parseBoolean = ({ value }: { value: unknown }) =>
  value === 'true' ? true : value === 'false' ? false : value;

export class HistoryQueryDto {
  @IsOptional()
  @Transform(normalizeSlug)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  exercise?: string;

  /** Whether `exercise` refers to the user's custom exercise. */
  @IsOptional()
  @Transform(parseBoolean)
  @IsBoolean()
  custom = false;

  @IsOptional()
  @Transform(normalizeSlug)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  muscleGroup?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;
}
