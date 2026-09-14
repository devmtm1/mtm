import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import * as authApi from '../api/auth';
import { ApiError } from '../api/client';
import type { AuthUser } from '../types/auth';
import { AuthContext } from './auth-context-store';

/** Indice local « une session a été ouverte ici » ; le cookie httpOnly reste la seule vérité. */
const SESSION_HINT_KEY = 'mtm.client-session';

function hasSessionHint(): boolean {
  try {
    return localStorage.getItem(SESSION_HINT_KEY) === '1';
  } catch {
    return true; // stockage indisponible : on tente la restauration
  }
}

function setSessionHint(active: boolean): void {
  try {
    if (active) localStorage.setItem(SESSION_HINT_KEY, '1');
    else localStorage.removeItem(SESSION_HINT_KEY);
  } catch {
    // stockage indisponible (navigation privée) : sans conséquence
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // Un visiteur qui ne s'est jamais connecté n'a pas de cookie de session :
    // inutile d'interroger l'API (et de journaliser un 403) à chaque visite.
    if (!hasSessionHint()) {
      setBootstrapping(false);
      return;
    }
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
        setSessionHint(false);
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
      setSessionHint(true);
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
    setSessionHint(false);
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
