import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class StartSessionDto {
  @IsOptional()
  @IsUUID()
  templateId?: string;
}

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
