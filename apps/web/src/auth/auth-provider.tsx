import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { ApiError, setApiAuth } from '@/lib/api';
import { setWeightUnit } from '@/lib/format';

import {
  demoRequest,
  loginRequest,
  logoutRequest,
  refreshRequest,
  registerRequest,
} from './auth-api';
import { AuthContext, type AuthContextValue } from './auth-context';
import type {
  AuthCredentials,
  AuthSession,
  AuthStatus,
  AuthUser,
} from './auth-types';

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const sessionRef = useRef<AuthSession | null>(null);

  // Cached queries are not keyed by user, so drop them whenever the signed-in
  // user changes to avoid showing one account's data to another.
  const applySession = useCallback(
    (nextSession: AuthSession | null) => {
      if (sessionRef.current?.user.id !== nextSession?.user.id) {
        queryClient.clear();
      }

      setWeightUnit(nextSession?.user.weightUnit ?? 'kg');
      sessionRef.current = nextSession;
      setSession(nextSession);
      setStatus(nextSession ? 'authenticated' : 'unauthenticated');
    },
    [queryClient],
  );

  useEffect(() => {
    let isActive = true;

    void refreshRequest()
      .then((restoredSession) => {
        if (isActive) {
          applySession(restoredSession);
        }
      })
      .catch(() => {
        if (isActive) {
          applySession(null);
        }
      });

    return () => {
      isActive = false;
    };
  }, [applySession]);

  useEffect(() => {
    setApiAuth({
      getAccessToken: () => sessionRef.current?.accessToken ?? null,
      refreshAccessToken: async () => {
        try {
          const nextSession = await refreshRequest();
          applySession(nextSession);
          return nextSession.accessToken;
        } catch (error) {
          if (error instanceof ApiError && error.status === 401) {
            applySession(null);
          }

          return null;
        }
      },
    });

    return () => setApiAuth(null);
  }, [applySession]);

  const login = useCallback(
    async (credentials: AuthCredentials) => {
      applySession(await loginRequest(credentials));
    },
    [applySession],
  );

  const register = useCallback(
    async (credentials: AuthCredentials) => {
      applySession(await registerRequest(credentials));
    },
    [applySession],
  );

  const startDemo = useCallback(async () => {
    applySession(await demoRequest());
  }, [applySession]);

  const logout = useCallback(async () => {
    await logoutRequest();
    applySession(null);
  }, [applySession]);

  const updateUser = useCallback(
    (user: AuthUser) => {
      if (sessionRef.current) {
        applySession({ ...sessionRef.current, user });
      }
    },
    [applySession],
  );

  const clearSession = useCallback(() => applySession(null), [applySession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user: session?.user ?? null,
      login,
      logout,
      register,
      startDemo,
      updateUser,
      clearSession,
    }),
    [
      clearSession,
      login,
      logout,
      register,
      session,
      startDemo,
      status,
      updateUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
