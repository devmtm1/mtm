/**
 * Miroir de AuthenticatedUser côté backend
 * (apps/api/src/modules/auth/auth.types.ts). Garder synchronisé.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
  mustChangePassword: boolean;
  twoFactorEnabled: boolean;
}

export interface LoginResponse {
  requiresTwoFactor: boolean;
  accessToken?: string;
  message?: string;
  user?: AuthenticatedUser;
}
