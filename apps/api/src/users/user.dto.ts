import { Equals, IsEnum, IsString } from 'class-validator';

import { WeightUnit } from '../generated/prisma/client.js';

export class UpdateWeightUnitDto {
  @IsEnum(WeightUnit)
  weightUnit: WeightUnit;
}

export class DeleteAccountDto {
  @IsString()
  password: string;

  @IsString()
  @Equals('hesabımı sil')
  confirmation: string;
}
