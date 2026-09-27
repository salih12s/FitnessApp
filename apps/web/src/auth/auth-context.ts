import { createContext } from 'react';

import type { AuthCredentials, AuthStatus, AuthUser } from './auth-types';

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  login: (credentials: AuthCredentials) => Promise<void>;
  logout: () => Promise<void>;
  register: (credentials: AuthCredentials) => Promise<void>;
  /** Replaces the signed-in user's profile after the server changed it. */
  updateUser: (user: AuthUser) => void;
  /** Signs out locally after the server already ended the session. */
  clearSession: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);
