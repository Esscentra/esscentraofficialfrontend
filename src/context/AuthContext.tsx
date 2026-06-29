import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { fetchMe, login as loginApi, logout as logoutApi } from '@/lib/authApi';
import type { User } from '@/types';

interface AuthContextValue {
  user: User | null;
  loading: boolean; // initial session bootstrap
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (u: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Non-sensitive hint that a session *might* exist. The real tokens live in
 * httpOnly cookies (unreadable from JS), so we use this flag only to decide
 * whether it's worth probing /me on boot. This keeps the login page from
 * firing failing /me + /refresh-token calls when the user is logged out.
 */
const SESSION_HINT = 'esscentra.authed';
const hasSessionHint = () => localStorage.getItem(SESSION_HINT) === '1';
const setSessionHint = (on: boolean) =>
  on ? localStorage.setItem(SESSION_HINT, '1') : localStorage.removeItem(SESSION_HINT);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Bootstrap: only ask the server who we are if we think a session exists.
  // If the access token is expired, the axios interceptor silently refreshes.
  useEffect(() => {
    if (!hasSessionHint()) {
      setLoading(false);
      return;
    }
    let active = true;
    fetchMe()
      .then((u) => {
        if (active) setUserState(u);
      })
      .catch(() => {
        // Session is gone — drop the hint so we stop probing on future loads.
        setSessionHint(false);
        if (active) setUserState(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const u = await loginApi({ email, password });
    setSessionHint(true);
    setUserState(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    // Never throw: even if the network call fails, we must clear local state
    // so the UI (ProtectedRoute / redirect) reacts immediately.
    try {
      await logoutApi();
    } catch {
      /* ignore — cookies are cleared server-side on success; local state is cleared below */
    } finally {
      setSessionHint(false);
      setUserState(null);
    }
  }, []);

  const refresh = useCallback(async () => {
    const u = await fetchMe();
    setSessionHint(true);
    setUserState(u);
  }, []);

  const setUser = useCallback((u: User) => setUserState(u), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      login,
      logout,
      refresh,
      setUser,
    }),
    [user, loading, login, logout, refresh, setUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
