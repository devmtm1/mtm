export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description: string | null;
}

export interface RoleListItem {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: { permission: Permission }[];
  _count?: { users: number };
}

export interface CreateRolePayload {
  name: string;
  description?: string;
}
