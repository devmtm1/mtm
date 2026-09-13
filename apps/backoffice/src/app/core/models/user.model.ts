export interface UserListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  twoFactorEnabled: boolean;
  /** Mot de passe provisoire : à changer à la prochaine connexion. */
  mustChangePassword?: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  roles: string[];
}

export interface CreateUserPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roleId: string;
}
