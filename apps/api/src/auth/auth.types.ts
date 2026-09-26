import type { Request } from 'express';

import type { PublicUser } from '../users/user.types.js';

export interface AccessTokenPayload {
  sub: string;
  username: string;
  typ: 'access';
}

export interface AuthResponse {
  accessToken: string;
  user: PublicUser;
}

export interface AuthenticatedRequest extends Request {
  user: AccessTokenPayload;
}

export interface SessionAuthResult {
  response: AuthResponse;
  refreshToken: string;
}
