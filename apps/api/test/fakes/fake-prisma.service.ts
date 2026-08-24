/**
 * Double de test in-memory reproduisant le sous-ensemble de l'API Prisma
 * réellement utilisé par les services de la Phase 0. Ce n'est PAS un
 * mock au sens "jest.fn()" : c'est une base de données en mémoire
 * minimale, suffisante pour exercer le vrai câblage HTTP de bout en bout
 * (guards, ValidationPipe, contrôleurs, services) dans les tests e2e de
 * ce sandbox, où le client Prisma généré n'est pas disponible (voir
 * apps/api/prisma/PRISMA_NOTES.md).
 *
 * Ne reproduit PAS la sémantique SQL réelle (jointures complexes,
 * contraintes de clé étrangère, etc.) — uniquement les formes d'appels
 * utilisées par le code de ce projet.
 */

interface FakeUser {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  mustChangePassword: boolean;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface FakeRole {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface FakePermission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description: string | null;
  createdAt: Date;
}

import { randomUUID } from 'crypto';

function fakeUuid(): string {
  return randomUUID();
}

export class FakePrismaService {
  users = new Map<string, FakeUser>();
  roles = new Map<string, FakeRole>();
  permissions = new Map<string, FakePermission>();
  userRoles: { userId: string; roleId: string }[] = [];
  rolePermissions: { roleId: string; permissionId: string }[] = [];
  auditLogs: {
    id: string;
    userId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    oldValue?: unknown;
    newValue?: unknown;
    ipAddress?: string;
    userAgent?: string;
    createdAt: Date;
  }[] = [];
  refreshTokens = new Map<
    string,
    {
      id: string;
      tokenHash: string;
      userId: string;
      expiresAt: Date;
      revokedAt: Date | null;
      createdAt: Date;
    }
  >();

  // --- Aides de seed pour les tests ---

  seedUser(
    partial: Partial<FakeUser> & { email: string; password: string },
  ): FakeUser {
    const user: FakeUser = {
      id: fakeUuid(),
      firstName: 'Test',
      lastName: 'User',
      isActive: true,
      mustChangePassword: false,
      failedLoginAttempts: 0,
      lockedUntil: null,
      twoFactorEnabled: false,
      twoFactorSecret: null,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...partial,
    };
    this.users.set(user.id, user);
    return user;
  }

  seedRole(name: string, isSystem = false): FakeRole {
    const role: FakeRole = {
      id: fakeUuid(),
      name,
      description: null,
      isSystem,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.roles.set(role.id, role);
    return role;
  }

  seedPermission(name: string): FakePermission {
    const [resource, action] = name.split(':');
    const permission: FakePermission = {
      id: fakeUuid(),
      name,
      resource,
      action,
      description: null,
      createdAt: new Date(),
    };
    this.permissions.set(permission.id, permission);
    return permission;
  }

  linkUserRole(userId: string, roleId: string): void {
    this.userRoles.push({ userId, roleId });
  }

  linkRolePermission(roleId: string, permissionId: string): void {
    this.rolePermissions.push({ roleId, permissionId });
  }

  private buildUserWithRoles(user: FakeUser) {
    const roleLinks = this.userRoles.filter((ur) => ur.userId === user.id);
    return {
      ...user,
      roles: roleLinks.map((link) => {
        const role = this.roles.get(link.roleId)!;
        const permLinks = this.rolePermissions.filter(
          (rp) => rp.roleId === role.id,
        );
        return {
          role: {
            name: role.name,
            permissions: permLinks.map((pl) => ({
              permission: { name: this.permissions.get(pl.permissionId)!.name },
            })),
          },
        };
      }),
    };
  }

  // --- API façon Prisma ---

  user = {
    findUnique: ({ where }: { where: { id?: string; email?: string } }) => {
      const user = where.id
        ? this.users.get(where.id)
        : Array.from(this.users.values()).find((u) => u.email === where.email);
      return Promise.resolve(user ? this.buildUserWithRoles(user) : null);
    },
    findMany: () => {
      return Promise.resolve(
        Array.from(this.users.values()).map((u) => this.buildUserWithRoles(u)),
      );
    },
    create: ({
      data,
    }: {
      data: Partial<FakeUser> & {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
      };
    }) => {
      const user = this.seedUser(data);
      return Promise.resolve(user);
    },
    update: ({
      where,
      data,
    }: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => {
      const user = this.users.get(where.id);
      if (!user) throw new Error('User not found (fake prisma)');
      const merged = { ...user, ...data };
      // Gère { increment: 1 } pour failedLoginAttempts, comme le vrai Prisma.
      if (
        data.failedLoginAttempts &&
        typeof data.failedLoginAttempts === 'object' &&
        'increment' in data.failedLoginAttempts
      ) {
        merged.failedLoginAttempts =
          user.failedLoginAttempts +
          (data.failedLoginAttempts as { increment: number }).increment;
      }
      merged.updatedAt = new Date();
      this.users.set(where.id, merged);
      return Promise.resolve(merged);
    },
  };

  role = {
    findUnique: ({ where }: { where: { id?: string; name?: string } }) => {
      const role = where.id
        ? this.roles.get(where.id)
        : Array.from(this.roles.values()).find((r) => r.name === where.name);
      return Promise.resolve(role ?? null);
    },
    findMany: () => Promise.resolve(Array.from(this.roles.values())),
    create: ({ data }: { data: { name: string; description?: string } }) => {
      const role = this.seedRole(data.name);
      role.description = data.description ?? null;
      return Promise.resolve(role);
    },
  };

  permission = {
    findMany: ({
      where,
    }: { where?: { name?: { in: string[] }; resource?: string } } = {}) => {
      let list = Array.from(this.permissions.values());
      if (where?.name?.in) {
        list = list.filter((p) => where.name!.in.includes(p.name));
      }
      if (where?.resource) {
        list = list.filter((p) => p.resource === where.resource);
      }
      return Promise.resolve(list);
    },
  };

  userRole = {
    upsert: ({
      create,
    }: {
      where: unknown;
      update: unknown;
      create: { userId: string; roleId: string };
    }) => {
      const exists = this.userRoles.some(
        (ur) => ur.userId === create.userId && ur.roleId === create.roleId,
      );
      if (!exists) this.userRoles.push(create);
      return Promise.resolve(create);
    },
    deleteMany: ({ where }: { where: { userId: string; roleId: string } }) => {
      this.userRoles = this.userRoles.filter(
        (ur) => !(ur.userId === where.userId && ur.roleId === where.roleId),
      );
      return Promise.resolve({ count: 1 });
    },
  };

  auditLog = {
    create: ({ data }: { data: Record<string, unknown> }) => {
      const entry = {
        id: fakeUuid(),
        createdAt: new Date(),
        ...data,
      } as (typeof this.auditLogs)[number];
      this.auditLogs.push(entry);
      return Promise.resolve(entry);
    },
    findMany: ({
      where,
      skip = 0,
      take = 50,
    }: {
      where?: Record<string, unknown>;
      skip?: number;
      take?: number;
      orderBy?: unknown;
      include?: unknown;
    }) => {
      let list = [...this.auditLogs].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );
      if (where?.entityType) {
        list = list.filter((l) => l.entityType === where.entityType);
      }
      if (where?.userId) {
        list = list.filter((l) => l.userId === where.userId);
      }
      if (where?.action) {
        list = list.filter((l) => l.action === where.action);
      }
      return Promise.resolve(list.slice(skip, skip + take));
    },
    count: ({ where }: { where?: Record<string, unknown> } = {}) => {
      let list = this.auditLogs;
      if (where?.entityType) {
        list = list.filter((l) => l.entityType === where.entityType);
      }
      return Promise.resolve(list.length);
    },
  };

  refreshToken = {
    create: ({
      data,
    }: {
      data: { userId: string; tokenHash: string; expiresAt: Date };
    }) => {
      const entry = {
        id: fakeUuid(),
        tokenHash: data.tokenHash,
        userId: data.userId,
        expiresAt: data.expiresAt,
        revokedAt: null,
        createdAt: new Date(),
      };
      this.refreshTokens.set(entry.id, entry);
      return Promise.resolve(entry);
    },
    findUnique: ({ where }: { where: { tokenHash: string } }) => {
      const entry = Array.from(this.refreshTokens.values()).find(
        (t) => t.tokenHash === where.tokenHash,
      );
      return Promise.resolve(entry ?? null);
    },
    update: ({
      where,
      data,
    }: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => {
      const entry = this.refreshTokens.get(where.id);
      if (!entry) throw new Error('RefreshToken not found (fake prisma)');
      const merged = { ...entry, ...data };
      this.refreshTokens.set(where.id, merged);
      return Promise.resolve(merged);
    },
    updateMany: ({ where }: { where: { tokenHash: string } }) => {
      const entry = Array.from(this.refreshTokens.values()).find(
        (t) => t.tokenHash === where.tokenHash,
      );
      if (entry) entry.revokedAt = new Date();
      return Promise.resolve({ count: entry ? 1 : 0 });
    },
  };

  // Utilisé par HealthService — simule une base disponible.
  $queryRaw = () => Promise.resolve([{ '?column?': 1 }]);

  $transaction = (ops: Promise<unknown>[]) => Promise.all(ops);
}
