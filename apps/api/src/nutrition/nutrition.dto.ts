import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { MEALS, type Meal } from './nutrition-math.js';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_CALORIES = 10_000;
const MAX_MACRO_GRAMS = 999.9;

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** Empty text means "not set" so a cleared field does not store a blank. */
const trimToUndefined = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

export class CreateFoodEntryDto {
  @Matches(DATE_PATTERN)
  eatenOn: string;

  @IsIn(MEALS)
  meal: Meal;

  @Transform(trim)
  @IsString()
  @Length(1, 120)
  name: string;

  @IsOptional()
  @Transform(trimToUndefined)
  @IsString()
  @MaxLength(60)
  servingLabel?: string;

  @IsInt()
  @Min(0)
  @Max(MAX_CALORIES)
  calories: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(MAX_MACRO_GRAMS)
  proteinG?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(MAX_MACRO_GRAMS)
  carbsG?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(MAX_MACRO_GRAMS)
  fatG?: number;

  @IsOptional()
  @Transform(trimToUndefined)
  @IsString()
  @MaxLength(500)
  note?: string;

  /** Also stores the food as a favorite for one-tap adding later. */
  @IsOptional()
  @IsBoolean()
  saveAsFavorite?: boolean;
}

export class UpdateFoodEntryDto {
  @IsOptional()
  @Matches(DATE_PATTERN)
  eatenOn?: string;

  @IsOptional()
  @IsIn(MEALS)
  meal?: Meal;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 120)
  name?: string;

  /** `null` clears the label. */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || null : value,
  )
  @IsString()
  @MaxLength(60)
  servingLabel?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_CALORIES)
  calories?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(MAX_MACRO_GRAMS)
  proteinG?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(MAX_MACRO_GRAMS)
  carbsG?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(MAX_MACRO_GRAMS)
  fatG?: number;

  /** `null` clears the note. */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || null : value,
  )
  @IsString()
  @MaxLength(500)
  note?: string | null;
}

export class CopyEntriesDto {
  @Matches(DATE_PATTERN)
  fromDate: string;

  @Matches(DATE_PATTERN)
  toDate: string;

  @IsOptional()
  @IsIn(MEALS)
  meal?: Meal;
}

export class SummaryQueryDto {
  @Matches(DATE_PATTERN)
  to: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  days?: number;
}

export class NutritionGoalDto {
  @IsInt()
  @Min(500)
  @Max(MAX_CALORIES)
  calories: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  proteinG?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1500)
  carbsG?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  fatG?: number;
}

export class SavedFoodDto {
  @Transform(trim)
  @IsString()
  @Length(1, 120)
  name: string;

  @IsOptional()
  @Transform(trimToUndefined)
  @IsString()
  @MaxLength(60)
  servingLabel?: string;

  @IsInt()
  @Min(0)
  @Max(MAX_CALORIES)
  calories: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(MAX_MACRO_GRAMS)
  proteinG?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(MAX_MACRO_GRAMS)
  carbsG?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(MAX_MACRO_GRAMS)
  fatG?: number;
}

export class CatalogQueryDto {
  @Transform(trim)
  @IsString()
  @Length(2, 80)
  q: string;
}

export class BatchFoodItemDto {
  @Transform(trim)
  @IsString()
  @Length(1, 120)
  name: string;

  @IsOptional()
  @Transform(trimToUndefined)
  @IsString()
  @MaxLength(60)
  servingLabel?: string;

  @IsInt()
  @Min(0)
  @Max(MAX_CALORIES)
  calories: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(MAX_MACRO_GRAMS)
  proteinG?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(MAX_MACRO_GRAMS)
  carbsG?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(MAX_MACRO_GRAMS)
  fatG?: number;
}

/** Several foods for one meal, for example the items found in a photo. */
export class BatchEntriesDto {
  @Matches(DATE_PATTERN)
  eatenOn: string;

  @IsIn(MEALS)
  meal: Meal;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => BatchFoodItemDto)
  items: BatchFoodItemDto[];
}
