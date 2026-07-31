import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { canAccessAppPath, isAdminRole, isInvestorRole, isSuperAdminRole } from '@/lib/utils';
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
 * Wraps the whole `/app` workspace and enforces the per-role page allowlist
 * (RESTRICTED_ROLE_PATHS in lib/utils). One choke point covers every child
 * route — present and future — so a narrow-surface role can't reach a page by
 * typing its URL. Roles with no allowlist pass straight through.
 *
 * Not a replacement for AdminRoute / StaffRoute: those still gate by tier.
 */
export function WorkspaceRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageLoader />;
  if (!canAccessAppPath(user?.role, location.pathname)) {
    return <Navigate to="/app" replace />;
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

/**
 * Guards super-admin-only pages (managing role types). Non-super-admins are
 * redirected to the dashboard.
 */
export function SuperAdminRoute({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageLoader />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (!isSuperAdminRole(user?.role)) {
    return <Navigate to="/app" replace />;
  }
  return <>{children}</>;
}

/**
 * Guards operational CRM pages (leads, deals, projects, tasks…). Read-only
 * stakeholders (INVESTOR) are sent back to the dashboard, which is the only
 * screen they get: aggregated KPIs without record-level data.
 */
export function StaffRoute({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageLoader />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (isInvestorRole(user?.role)) {
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
