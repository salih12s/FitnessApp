import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

import { NormalizeUsername, USERNAME_PATTERN } from './username.js';

export class RegisterDto {
  @NormalizeUsername()
  @IsString()
  @Matches(USERNAME_PATTERN, {
    message:
      'Kullanıcı adı 3-20 karakter olmalı; harf, rakam, nokta ve alt çizgi kullanılabilir.',
  })
  username: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}
