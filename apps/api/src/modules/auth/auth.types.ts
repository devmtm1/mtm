export interface AuthenticatedUser {
  id: string;
  /** Absent pour un client qui s'est ouvert un espace avec son seul numéro de téléphone. */
  email: string | null;
  /** Numéro de connexion (format international), pour un compte qui en a un. */
  telephone: string | null;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
  mustChangePassword: boolean;
  twoFactorEnabled: boolean;
}

export interface LoginResult {
  requiresTwoFactor: false;
  accessToken: string;
  user: AuthenticatedUser;
}

export interface TwoFactorRequiredResult {
  requiresTwoFactor: true;
  message: string;
}

export type LoginResponse = LoginResult | TwoFactorRequiredResult;

export interface JwtPayload {
  sub: string; // userId
  email: string | null;
}
