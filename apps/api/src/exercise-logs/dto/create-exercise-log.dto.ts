import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateExerciseSetDto {
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'number') {
      return String(value);
    }

    return typeof value === 'string' ? value.trim() : value;
  })
  @Matches(/^(?:0|[1-9]\d{0,3})(?:\.\d{1,2})?$/, {
    message: 'weightKg must be between 0 and 9999.99 with up to 2 decimals',
  })
  weightKg: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  reps: number;
}

export class CreateExerciseLogDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CreateExerciseSetDto)
  sets: CreateExerciseSetDto[];
}
