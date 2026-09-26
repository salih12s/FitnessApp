import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export function normalizeText({ value }: { value: unknown }) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;
}

// Keeps line breaks so multi-step instructions stay readable.
function normalizeMultilineText({ value }: { value: unknown }) {
  if (typeof value !== 'string') {
    return value;
  }

  return value
    .split(/\r\n?|\n/)
    .map((line) => line.trim().replace(/\s+/g, ' '))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export class CreateCustomExerciseDto {
  @Transform(normalizeText)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @Transform(normalizeText)
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  muscleGroup: string;

  @Transform(normalizeText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  equipment: string;

  @IsOptional()
  @Transform(normalizeMultilineText)
  @IsString()
  @MaxLength(1_000)
  instructions?: string;
}
