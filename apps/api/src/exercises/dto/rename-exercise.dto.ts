import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

import { normalizeText } from './create-custom-exercise.dto.js';

export class RenameExerciseDto {
  @Transform(normalizeText)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;
}
