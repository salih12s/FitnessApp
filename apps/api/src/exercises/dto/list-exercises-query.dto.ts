import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class ListExercisesQueryDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  muscleGroup: string;
}
