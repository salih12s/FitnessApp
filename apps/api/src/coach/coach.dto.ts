import { IsBoolean, IsString, IsUUID, MaxLength } from 'class-validator';

export class CoachModeDto {
  @IsBoolean()
  enabled: boolean;
}

export class AcceptInviteDto {
  @IsString()
  @MaxLength(32)
  code: string;
}

export class AssignTemplateDto {
  @IsUUID()
  templateId: string;
}
