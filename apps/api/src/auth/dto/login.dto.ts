import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

import { NormalizeUsername } from './username.js';

export class LoginDto {
  @NormalizeUsername()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  username: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password: string;
}
