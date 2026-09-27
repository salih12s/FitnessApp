import { Navigate, Outlet, useLocation } from 'react-router';

import { AuthLoadingScreen } from './auth-loading-screen';
import { postAuthDestination } from './route-access';
import { useAuth } from './use-auth';

export function GuestRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <AuthLoadingScreen />;
  }

  if (status === 'authenticated') {
    // Signing in from an invite link returns there, not to home.
    return <Navigate replace to={postAuthDestination(location.state)} />;
  }

  return <Outlet />;
}
