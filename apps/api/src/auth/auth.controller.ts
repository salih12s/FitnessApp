import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { AccessTokenGuard } from './access-token.guard.js';
import { AuthConfig } from './auth.config.js';
import { REFRESH_COOKIE_NAME } from './auth.constants.js';
import { AuthService } from './auth.service.js';
import type { AuthenticatedRequest, AuthResponse } from './auth.types.js';
import { LoginDto } from './dto/login.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { RegisterDto } from './dto/register.dto.js';

function readCookie(request: Request, name: string): string | undefined {
  const cookie = request.headers.cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  if (!cookie) {
    return undefined;
  }

  return cookie.slice(name.length + 1);
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authConfig: AuthConfig,
    private readonly authService: AuthService,
  ) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const result = await this.authService.register(dto.username, dto.password);
    this.setRefreshCookie(response, result.refreshToken);

    return result.response;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const result = await this.authService.login(dto.username, dto.password);
    this.setRefreshCookie(response, result.refreshToken);

    return result.response;
  }

  @Post('demo')
  @HttpCode(HttpStatus.OK)
  async demo(
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const result = await this.authService.startDemo();
    this.setRefreshCookie(response, result.refreshToken);

    return result.response;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const refreshToken = readCookie(request, REFRESH_COOKIE_NAME);

    if (!refreshToken) {
      throw new UnauthorizedException('A valid refresh session is required.');
    }

    // A failed refresh deliberately leaves the cookie alone: when two refreshes
    // race, the loser must not clear the rotated cookie the winner just set.
    const result = await this.authService.refresh(refreshToken);
    this.setRefreshCookie(response, result.refreshToken);
    return result.response;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.logout(readCookie(request, REFRESH_COOKIE_NAME));
    this.clearRefreshCookie(response);
  }

  @Get('me')
  @UseGuards(AccessTokenGuard)
  getMe(@Req() request: AuthenticatedRequest) {
    return this.authService.getCurrentUser(request.user.sub);
  }

  @Get('sessions/count')
  @UseGuards(AccessTokenGuard)
  async otherSessionCount(@Req() request: AuthenticatedRequest) {
    return {
      otherSessions: await this.authService.otherSessionCount(
        request.user.sub,
        readCookie(request, REFRESH_COOKIE_NAME),
      ),
    };
  }

  @Post('logout-others')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard)
  logoutOthers(@Req() request: AuthenticatedRequest): Promise<void> {
    return this.authService.logoutOthers(
      request.user.sub,
      readCookie(request, REFRESH_COOKIE_NAME),
    );
  }

  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard)
  changePassword(
    @Req() request: AuthenticatedRequest,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    return this.authService.changePassword(
      request.user.sub,
      dto.currentPassword,
      dto.newPassword,
      readCookie(request, REFRESH_COOKIE_NAME),
    );
  }

  private setRefreshCookie(response: Response, refreshToken: string): void {
    response.cookie(
      REFRESH_COOKIE_NAME,
      refreshToken,
      this.authConfig.refreshCookieOptions,
    );
  }

  private clearRefreshCookie(response: Response): void {
    response.clearCookie(
      REFRESH_COOKIE_NAME,
      this.authConfig.refreshCookieClearOptions,
    );
  }
}
