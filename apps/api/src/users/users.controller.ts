import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Patch,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';

import { AccessTokenGuard } from '../auth/access-token.guard.js';
import { AuthConfig } from '../auth/auth.config.js';
import { REFRESH_COOKIE_NAME } from '../auth/auth.constants.js';
import type { AuthenticatedRequest } from '../auth/auth.types.js';
import { DeleteAccountDto, UpdateWeightUnitDto } from './user.dto.js';
import { UsersService } from './users.service.js';

@Controller('users')
@UseGuards(AccessTokenGuard)
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly authConfig: AuthConfig,
  ) {}

  @Patch('me/preferences')
  updatePreferences(
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateWeightUnitDto,
  ) {
    return this.users.updateWeightUnit(request.user.sub, dto.weightUnit);
  }

  @Delete('me')
  @HttpCode(204)
  async deleteAccount(
    @Req() request: AuthenticatedRequest,
    @Body() dto: DeleteAccountDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.users.deleteAccount(
      request.user.sub,
      dto.password,
      dto.confirmation,
    );
    response.clearCookie(
      REFRESH_COOKIE_NAME,
      this.authConfig.refreshCookieClearOptions,
    );
  }
}
