import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions } from 'express';

function parsePositiveInteger(value: string, name: string): number {
  const parsedValue = Number(value);

  if (!Number.isSafeInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsedValue;
}

@Injectable()
export class AuthConfig {
  readonly accessTokenSecret: string;
  readonly accessTokenTtlSeconds: number;
  readonly refreshTokenTtlMilliseconds: number;
  readonly refreshCookieSecure: boolean;

  constructor(config: ConfigService) {
    const accessTokenSecret = config.get<string>('JWT_ACCESS_SECRET')?.trim();
    const accessTokenTtlSeconds = config
      .get<string>('JWT_ACCESS_TTL_SECONDS')
      ?.trim();
    const refreshTokenTtlDays = config
      .get<string>('REFRESH_TOKEN_TTL_DAYS')
      ?.trim();
    const refreshCookieSecure = config
      .get<string>('REFRESH_COOKIE_SECURE')
      ?.trim()
      .toLowerCase();

    if (!accessTokenSecret || accessTokenSecret.length < 32) {
      throw new Error('JWT_ACCESS_SECRET must contain at least 32 characters.');
    }

    if (!accessTokenTtlSeconds) {
      throw new Error('JWT_ACCESS_TTL_SECONDS is required.');
    }

    if (!refreshTokenTtlDays) {
      throw new Error('REFRESH_TOKEN_TTL_DAYS is required.');
    }

    if (!['true', 'false'].includes(refreshCookieSecure ?? '')) {
      throw new Error('REFRESH_COOKIE_SECURE must be true or false.');
    }

    this.accessTokenSecret = accessTokenSecret;
    this.accessTokenTtlSeconds = parsePositiveInteger(
      accessTokenTtlSeconds,
      'JWT_ACCESS_TTL_SECONDS',
    );
    this.refreshTokenTtlMilliseconds =
      parsePositiveInteger(refreshTokenTtlDays, 'REFRESH_TOKEN_TTL_DAYS') *
      24 *
      60 *
      60 *
      1000;
    this.refreshCookieSecure = refreshCookieSecure === 'true';
  }

  get refreshCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      maxAge: this.refreshTokenTtlMilliseconds,
      path: '/api/auth',
      sameSite: 'lax',
      secure: this.refreshCookieSecure,
    };
  }

  get refreshCookieClearOptions(): CookieOptions {
    return {
      httpOnly: true,
      path: '/api/auth',
      sameSite: 'lax',
      secure: this.refreshCookieSecure,
    };
  }
}
