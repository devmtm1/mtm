export interface AuthUser {
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

/** `identifiant` : l'adresse e-mail ou le numéro de téléphone du compte. */
export interface LoginPayload {
  identifiant: string;
  password: string;
  twoFactorCode?: string;
}

export type LoginResult =
  | { requiresTwoFactor: true; message?: string }
  | { requiresTwoFactor: false; accessToken: string; user: AuthUser };

export interface RefreshResult {
  accessToken: string;
}
