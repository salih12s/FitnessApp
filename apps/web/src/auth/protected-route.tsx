import { Navigate, Outlet, useLocation } from 'react-router';

import { AuthLoadingScreen } from './auth-loading-screen';
import { protectedRouteRedirect } from './route-access';
import { useAuth } from './use-auth';

export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <AuthLoadingScreen />;
  }

  if (protectedRouteRedirect(status)) {
    return (
      <Navigate
        replace
        state={{ from: `${location.pathname}${location.search}` }}
        to="/login"
      />
    );
  }

  return <Outlet />;
}
