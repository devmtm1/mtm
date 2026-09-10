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

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans un <AuthProvider>');
  return context;
}
