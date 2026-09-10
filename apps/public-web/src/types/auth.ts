export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
  mustChangePassword: boolean;
  twoFactorEnabled: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
  twoFactorCode?: string;
}

export type LoginResult =
  | { requiresTwoFactor: true; message?: string }
  | { requiresTwoFactor: false; accessToken: string; user: AuthUser };

export interface RefreshResult {
  accessToken: string;
}
