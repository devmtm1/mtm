import { createContext, useContext } from 'react';
import type { AuthUser, LoginResult } from '../types/auth';

export interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  /** Vrai pendant la tentative de reprise de session au chargement de l'app. */
  bootstrapping: boolean;
  login: (email: string, password: string, twoFactorCode?: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  /** Recharge l'utilisateur courant (ex. après un changement de mot de passe). */
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Session d'un client de l'espace client (rôle « client »), ou null. Sert aux
 * formulaires publics : un client connecté n'a pas à ressaisir son identité.
 */
export function useClientSession(): { token: string; firstName: string; lastName: string; email: string } | null {
  const { user, accessToken } = useAuth();
  if (!user || !accessToken || !user.roles.includes('client')) return null;
  return { token: accessToken, firstName: user.firstName, lastName: user.lastName, email: user.email };
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans un <AuthProvider>');
  return context;
}
