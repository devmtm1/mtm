import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import * as authApi from '../api/auth';
import { ApiError } from '../api/client';
import type { AuthUser } from '../types/auth';
import { AuthContext } from './auth-context-store';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { accessToken: token } = await authApi.refresh();
        if (cancelled) return;
        const me = await authApi.fetchMe(token);
        if (cancelled) return;
        setAccessToken(token);
        setUser(me);
      } catch {
        // Pas de session active (cookie absent/expiré) : c'est l'état normal
        // d'un visiteur non connecté, pas une erreur à afficher.
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string, twoFactorCode?: string) => {
    const result = await authApi.login({ email, password, twoFactorCode });
    if (!result.requiresTwoFactor) {
      setAccessToken(result.accessToken);
      setUser(result.user);
    }
    return result;
  }, []);

  const logout = useCallback(async () => {
    if (accessToken) {
      try {
        await authApi.logout(accessToken);
      } catch {
        // Le nettoyage local doit avoir lieu même si l'appel serveur échoue.
      }
    }
    setAccessToken(null);
    setUser(null);
  }, [accessToken]);

  const refreshUser = useCallback(async () => {
    if (!accessToken) return;
    try {
      const me = await authApi.fetchMe(accessToken);
      setUser(me);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setAccessToken(null);
        setUser(null);
      }
    }
  }, [accessToken]);

  const value = useMemo(
    () => ({ user, accessToken, bootstrapping, login, logout, refreshUser }),
    [user, accessToken, bootstrapping, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
