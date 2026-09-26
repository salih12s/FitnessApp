import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class TemplateExerciseDto {
  @IsUUID()
  exerciseId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  targetSets: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  targetReps: number;

  /** Optional target load; omitted or null means "choose on the day". */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'number'
      ? String(value)
      : typeof value === 'string'
        ? value.trim()
        : value,
  )
  @Matches(/^(?:0|[1-9]\d{0,3})(?:\.\d{1,2})?$/, {
    message:
      'targetWeightKg must be between 0 and 9999.99 with up to 2 decimals',
  })
  targetWeightKg?: string | null;
}

export class TemplateDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 80)
  name: string;

  /** Weekday bitmask: Monday = 1, Tuesday = 2, ... Sunday = 64. */
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(127)
  scheduledDays: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => TemplateExerciseDto)
  exercises: TemplateExerciseDto[];
}
