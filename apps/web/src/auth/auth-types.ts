import type { WeightUnit } from '@/lib/format';

export interface AuthUser {
  id: string;
  username: string;
  weightUnit: WeightUnit;
  isCoach: boolean;
  /** A sample account from "Demo hesabıyla dene", removed after a day. */
  isDemo: boolean;
  createdAt: string;
}

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
}

export interface AuthCredentials {
  username: string;
  password: string;
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';
