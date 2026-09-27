import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateMeasurementDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  measuredAt: string;

  @IsOptional()
  @Matches(/^(?:0|[1-9]\d{0,2})(?:\.\d{1,2})?$/)
  weightKg?: string;

  @IsOptional()
  @Matches(/^(?:0|[1-9]\d?|100)(?:\.\d)?$/)
  bodyFatPercent?: string;

  @IsOptional()
  @Matches(/^(?:0|[1-9]\d{0,2})(?:\.\d)?$/)
  waistCm?: string;

  @IsOptional()
  @Matches(/^(?:0|[1-9]\d{0,2})(?:\.\d)?$/)
  chestCm?: string;

  @IsOptional()
  @Matches(/^(?:0|[1-9]\d{0,2})(?:\.\d)?$/)
  armCm?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
