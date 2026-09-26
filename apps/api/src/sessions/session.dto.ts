import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSessionDto {
  @IsString()
  @MaxLength(1000)
  note: string;
}

export class FinishSessionDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
