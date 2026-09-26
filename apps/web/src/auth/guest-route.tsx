import { Navigate, Outlet } from 'react-router';

import { AuthLoadingScreen } from './auth-loading-screen';
import { useAuth } from './use-auth';

export function GuestRoute() {
  const { status } = useAuth();

  if (status === 'loading') {
    return <AuthLoadingScreen />;
  }

  if (status === 'authenticated') {
    return <Navigate replace to="/app" />;
  }

  return <Outlet />;
}
