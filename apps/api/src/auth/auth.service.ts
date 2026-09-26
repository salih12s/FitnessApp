import { createHash, randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';

import { PrismaService } from '../prisma/prisma.service.js';
import type { PublicUser } from '../users/user.types.js';
import { UsersService } from '../users/users.service.js';
import { AuthConfig } from './auth.config.js';
import type {
  AccessTokenPayload,
  AuthResponse,
  SessionAuthResult,
} from './auth.types.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly authConfig: AuthConfig,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  async register(
    username: string,
    password: string,
  ): Promise<SessionAuthResult> {
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const user = await this.users.create(
      this.normalizeUsername(username),
      passwordHash,
    );

    return this.createSession(user);
  }

  async login(username: string, password: string): Promise<SessionAuthResult> {
    const user = await this.users.findByUsernameWithPassword(
      this.normalizeUsername(username),
    );
    const passwordMatches = user
      ? await argon2.verify(user.passwordHash, password)
      : false;

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid username or password.');
    }

    return this.createSession({
      id: user.id,
      username: user.username,
      createdAt: user.createdAt,
    });
  }

  async refresh(refreshToken: string): Promise<SessionAuthResult> {
    const tokenHash = this.hashRefreshToken(refreshToken);
    const session = await this.prisma.client.refreshSession.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        expiresAt: true,
        user: {
          select: {
            id: true,
            username: true,
            createdAt: true,
          },
        },
      },
    });

    if (!session || session.expiresAt <= new Date()) {
      if (session) {
        await this.prisma.client.refreshSession.deleteMany({
          where: { id: session.id, tokenHash },
        });
      }

      throw new UnauthorizedException('Refresh session is invalid or expired.');
    }

    const nextRefreshToken = this.generateRefreshToken();
    const nextTokenHash = this.hashRefreshToken(nextRefreshToken);
    const nextExpiresAt = this.getRefreshExpiry();
    const rotation = await this.prisma.client.refreshSession.updateMany({
      where: { id: session.id, tokenHash },
      data: { tokenHash: nextTokenHash, expiresAt: nextExpiresAt },
    });

    if (rotation.count !== 1) {
      throw new UnauthorizedException('Refresh session is invalid or expired.');
    }

    return {
      response: await this.createAuthResponse(session.user),
      refreshToken: nextRefreshToken,
    };
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) {
      return;
    }

    await this.prisma.client.refreshSession.deleteMany({
      where: { tokenHash: this.hashRefreshToken(refreshToken) },
    });
  }

  async getCurrentUser(userId: string): Promise<PublicUser> {
    const user = await this.users.findPublicById(userId);

    if (!user) {
      throw new UnauthorizedException(
        'The authenticated user no longer exists.',
      );
    }

    return user;
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        secret: this.authConfig.accessTokenSecret,
      });

      if (
        payload.typ !== 'access' ||
        typeof payload.sub !== 'string' ||
        typeof payload.username !== 'string'
      ) {
        throw new Error('Invalid access token payload.');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('A valid access token is required.');
    }
  }

  private async createSession(user: PublicUser): Promise<SessionAuthResult> {
    const refreshToken = this.generateRefreshToken();

    await this.prisma.client.refreshSession.create({
      data: {
        userId: user.id,
        tokenHash: this.hashRefreshToken(refreshToken),
        expiresAt: this.getRefreshExpiry(),
      },
    });

    return {
      response: await this.createAuthResponse(user),
      refreshToken,
    };
  }

  private async createAuthResponse(user: PublicUser): Promise<AuthResponse> {
    return {
      accessToken: await this.jwt.signAsync(
        { sub: user.id, username: user.username, typ: 'access' },
        {
          secret: this.authConfig.accessTokenSecret,
          expiresIn: this.authConfig.accessTokenTtlSeconds,
        },
      ),
      user,
    };
  }

  private generateRefreshToken(): string {
    return randomBytes(48).toString('base64url');
  }

  private getRefreshExpiry(): Date {
    return new Date(Date.now() + this.authConfig.refreshTokenTtlMilliseconds);
  }

  private hashRefreshToken(refreshToken: string): string {
    return createHash('sha256').update(refreshToken).digest('hex');
  }

  private normalizeUsername(username: string): string {
    return username.trim().toLowerCase();
  }
}
