import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { isAdminRole } from '@/lib/utils';
import { FullPageLoader } from './FullPageLoader';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageLoader />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}

/**
 * Guards admin-only pages (users, roles, KYC review). Must sit inside an
 * authenticated route. Non-admins are sent back to the dashboard so they can't
 * reach these screens by typing the URL.
 */
export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageLoader />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (!isAdminRole(user?.role)) {
    return <Navigate to="/app" replace />;
  }
  return <>{children}</>;
}

/** Redirects already-authenticated users away from auth screens. */
export function GuestRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (isAuthenticated) return <Navigate to="/app" replace />;
  return <>{children}</>;
}
