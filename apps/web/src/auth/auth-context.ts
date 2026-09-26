import { createContext } from 'react';

import type { AuthCredentials, AuthStatus, AuthUser } from './auth-types';

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  login: (credentials: AuthCredentials) => Promise<void>;
  logout: () => Promise<void>;
  register: (credentials: AuthCredentials) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);
