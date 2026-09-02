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

interface FakeProspect {
  id: string;
  nom: string;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  paysResidence: string | null;
  sourceAcquisition: string | null;
  besoins: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  preferences: string | null;
  commercialResponsableId: string | null;
  statutPipeline: string;
  score: number | null;
  createdAt: Date;
  updatedAt: Date;
}

interface FakeActiviteCrm {
  id: string;
  prospectId: string;
  type: string;
  titre: string;
  description: string | null;
  dateEcheance: Date | null;
  dateRealisation: Date | null;
  statut: string;
  priorite: string;
  createdAt: Date;
  updatedAt: Date;
}

interface FakeDocumentCrm {
  id: string;
  prospectId: string;
  type: string;
  title: string | null;
  isPublic: boolean;
  storageKey: string;
  resourceType: string;
  url: string | null;
  version: number;
  createdAt: Date;
}

interface FakeDossierVente {
  id: string;
  prospectId: string;
  terrainId: string | null;
  mandatId: string | null;
  statut: string;
  createdAt: Date;
  updatedAt: Date;
}

interface FakeSystemSetting {
  id: string;
  key: string;
  value: unknown;
  description: string | null;
  isSensitive: boolean;
  updatedById: string | null;
  updatedAt: Date;
  createdAt: Date;
}

interface FakeContact {
  id: string;
  terrainId: string | null;
  nom: string;
  email: string;
  telephone: string | null;
  sujet: string | null;
  message: string;
  lu: boolean;
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

  prospects = new Map<string, FakeProspect>();
  activitesCrm = new Map<string, FakeActiviteCrm>();
  documentsCrm = new Map<string, FakeDocumentCrm>();
  dossiersVente = new Map<string, FakeDossierVente>();
  systemSettings = new Map<string, FakeSystemSetting>();
  contacts = new Map<string, FakeContact>();

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

  seedProspect(partial: Partial<FakeProspect> = {}): FakeProspect {
    const prospect: FakeProspect = {
      id: fakeUuid(),
      nom: '',
      prenom: null,
      email: null,
      telephone: null,
      paysResidence: null,
      sourceAcquisition: null,
      besoins: null,
      budgetMin: null,
      budgetMax: null,
      preferences: null,
      commercialResponsableId: null,
      statutPipeline: 'nouveau_contact',
      score: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...partial,
    };
    this.prospects.set(prospect.id, prospect);
    return prospect;
  }

  seedContact(partial: Partial<FakeContact> = {}): FakeContact {
    const contact: FakeContact = {
      id: fakeUuid(),
      terrainId: null,
      nom: '',
      email: '',
      telephone: null,
      sujet: null,
      message: '',
      lu: false,
      createdAt: new Date(),
      ...partial,
    };
    this.contacts.set(contact.id, contact);
    return contact;
  }

  createContact(partial: Partial<FakeContact> = {}): FakeContact {
    return this.seedContact(partial);
  }

  seedSystemSetting(
    partial: Partial<FakeSystemSetting> = {},
  ): FakeSystemSetting {
    const setting: FakeSystemSetting = {
      id: fakeUuid(),
      key: '',
      value: null,
      description: null,
      isSensitive: false,
      updatedById: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...partial,
    };
    this.systemSettings.set(setting.key, setting);
    return setting;
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

  prospect = {
    findUnique: ({
      where,
      include,
    }: {
      where: { id: string };
      include?: unknown;
    }) => {
      const prospect = this.prospects.get(where.id);
      if (!prospect) return Promise.resolve(null);
      if (!include) return Promise.resolve(prospect);
      const inc = include as Record<string, unknown>;
      const result: Record<string, unknown> = { ...prospect };
      if (inc.commercialResponsable) {
        const user = this.users.get(prospect.commercialResponsableId ?? '');
        const sel = (inc.commercialResponsable as Record<string, unknown>)
          .select as Record<string, boolean> | undefined;
        result.commercialResponsable = user
          ? sel
            ? Object.fromEntries(Object.entries(user).filter(([k]) => sel[k]))
            : user
          : null;
      }
      if (inc.activites) {
        result.activites = Array.from(this.activitesCrm.values()).filter(
          (a) => a.prospectId === prospect.id,
        );
      }
      if (inc.documents) {
        result.documents = Array.from(this.documentsCrm.values()).filter(
          (d) => d.prospectId === prospect.id,
        );
      }
      if (inc.dossiers) {
        result.dossiers = Array.from(this.dossiersVente.values()).filter(
          (d) => d.prospectId === prospect.id,
        );
      }
      if (inc._count) {
        result._count = {
          activites: (result.activites as unknown[]).length,
          documents: (result.documents as unknown[]).length,
          dossiers: (result.dossiers as unknown[]).length,
        };
      }
      return Promise.resolve(result);
    },
    findFirst: ({ where }: { where: Record<string, unknown> }) => {
      const list = Array.from(this.prospects.values()).filter((p) => {
        const w = where;
        if (w.id && p.id !== w.id) return false;
        if (w.email && p.email !== w.email) return false;
        if (w.telephone && p.telephone !== w.telephone) return false;
        if (w.OR && Array.isArray(w.OR)) {
          return (w.OR as Record<string, unknown>[]).some((clause) => {
            if (clause.email && p.email !== clause.email) return false;
            if (clause.telephone && p.telephone !== clause.telephone)
              return false;
            return true;
          });
        }
        return true;
      });
      return Promise.resolve(list[0] ?? null);
    },
    findMany: ({
      where,
      include: _include,
      orderBy,
      skip,
      take,
    }: Record<string, unknown> = {}) => {
      let list = Array.from(this.prospects.values());
      const w = where as Record<string, unknown> | undefined;
      if (w?.commercialResponsableId) {
        list = list.filter(
          (p) => p.commercialResponsableId === w.commercialResponsableId,
        );
      }
      if (w?.statutPipeline) {
        list = list.filter((p) => p.statutPipeline === w.statutPipeline);
      }
      if (w?.sourceAcquisition) {
        list = list.filter((p) => p.sourceAcquisition === w.sourceAcquisition);
      }
      if (w?.createdAt) {
        const c = w.createdAt as Record<string, Date>;
        if (c.gte) list = list.filter((p) => p.createdAt >= c.gte);
        if (c.lte) list = list.filter((p) => p.createdAt <= c.lte);
      }
      const ob = orderBy as Record<string, string> | undefined;
      if (ob) {
        const key = Object.keys(ob)[0];
        const dir = ob[key];
        list.sort((a, b) => {
          const aVal = a[key as keyof FakeProspect];
          const bVal = b[key as keyof FakeProspect];
          if (aVal === null || aVal === undefined) return 1;
          if (bVal === null || bVal === undefined) return -1;
          if (aVal < bVal) return dir === 'desc' ? 1 : -1;
          if (aVal > bVal) return dir === 'desc' ? -1 : 1;
          return 0;
        });
      }
      const s = typeof skip === 'number' ? skip : 0;
      const t = typeof take === 'number' ? take : list.length;
      const paginated = list.slice(s, s + t);
      if (include) {
        const inc = include as Record<string, unknown>;
        return Promise.resolve(
          paginated.map((p) => {
            const result: Record<string, unknown> = { ...p };
            if (inc.commercialResponsable) {
              const user = this.users.get(p.commercialResponsableId ?? '');
              const sel = (inc.commercialResponsable as Record<string, unknown>)
                .select as Record<string, boolean> | undefined;
              result.commercialResponsable = user
                ? sel
                  ? Object.fromEntries(
                      Object.entries(user).filter(([k]) => sel[k]),
                    )
                  : user
                : null;
            }
            if (inc.activites) {
              result.activites = Array.from(this.activitesCrm.values()).filter(
                (a) => a.prospectId === p.id,
              );
            }
            if (inc.documents) {
              result.documents = Array.from(this.documentsCrm.values()).filter(
                (d) => d.prospectId === p.id,
              );
            }
            if (inc.dossiers) {
              result.dossiers = Array.from(this.dossiersVente.values()).filter(
                (d) => d.prospectId === p.id,
              );
            }
            if (inc._count) {
              result._count = {
                activites: (result.activites as unknown[]).length,
                documents: (result.documents as unknown[]).length,
                dossiers: (result.dossiers as unknown[]).length,
              };
            }
            return result;
          }),
        );
      }
      return Promise.resolve(paginated);
    },
    count: ({ where }: { where?: Record<string, unknown> } = {}) => {
      let list = Array.from(this.prospects.values());
      const w = where;
      if (w?.commercialResponsableId) {
        list = list.filter(
          (p) => p.commercialResponsableId === w.commercialResponsableId,
        );
      }
      return Promise.resolve(list.length);
    },
    groupBy: ({ where, by, _count }: Record<string, unknown> = {}) => {
      const list: FakeProspect[] = [];
      const w = where as Record<string, unknown> | undefined;
      if (w?.commercialResponsableId) {
        const all = Array.from(this.prospects.values()).filter(
          (p) => p.commercialResponsableId === w.commercialResponsableId,
        );
        list.push(...all);
      } else {
        list.push(...Array.from(this.prospects.values()));
      }
      const groups = new Map<string, number>();
      for (const p of list) {
        const key = by instanceof Array ? by[0] : 'statutPipeline';
        const val = p[key as keyof FakeProspect] as string;
        groups.set(val, (groups.get(val) || 0) + 1);
      }
      return Promise.resolve(
        Array.from(groups.entries()).map(([statutPipeline, _count]) => ({
          statutPipeline,
          _count: { statutPipeline: _count },
        })),
      );
    },
    create: ({
      data,
      include: _include,
    }: {
      data: Partial<FakeProspect>;
      include?: unknown;
    }) => {
      const prospect = this.seedProspect(data);
      return Promise.resolve(prospect);
    },
    update: ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<FakeProspect>;
    }) => {
      const existing = this.prospects.get(where.id);
      if (!existing) throw new Error('Prospect not found (fake prisma)');
      const merged = { ...existing, ...data, updatedAt: new Date() };
      this.prospects.set(where.id, merged);
      return Promise.resolve(merged);
    },
    delete: ({ where }: { where: { id: string } }) => {
      const existing = this.prospects.get(where.id);
      if (!existing) throw new Error('Prospect not found (fake prisma)');
      this.prospects.delete(where.id);
      return Promise.resolve(existing);
    },
  };

  contact = {
    findUnique: ({ where }: { where: { id: string } }) => {
      return Promise.resolve(this.contacts.get(where.id) ?? null);
    },
    update: ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<FakeContact>;
    }) => {
      const existing = this.contacts.get(where.id);
      if (!existing) throw new Error('Contact not found (fake prisma)');
      const merged = { ...existing, ...data };
      this.contacts.set(where.id, merged);
      return Promise.resolve(merged);
    },
  };

  activiteCrm = {
    findMany: ({ where, orderBy }: Record<string, unknown> = {}) => {
      let list = Array.from(this.activitesCrm.values());
      const w = where as Record<string, unknown> | undefined;
      if (w?.prospectId) {
        list = list.filter((a) => a.prospectId === w.prospectId);
      }
      if (w?.statut) {
        list = list.filter((a) => a.statut === w.statut);
      }
      const ob = orderBy as Record<string, string> | undefined;
      if (ob) {
        const key = Object.keys(ob)[0];
        const dir = ob[key];
        list.sort((a, b) => {
          const aVal = a[key as keyof FakeActiviteCrm];
          const bVal = b[key as keyof FakeActiviteCrm];
          if (aVal === null || aVal === undefined) return 1;
          if (bVal === null || bVal === undefined) return -1;
          if (aVal < bVal) return dir === 'desc' ? 1 : -1;
          if (aVal > bVal) return dir === 'desc' ? -1 : 1;
          return 0;
        });
      }
      return Promise.resolve(list);
    },
    count: ({ where }: { where?: Record<string, unknown> } = {}) => {
      let list = Array.from(this.activitesCrm.values());
      const w = where;
      if (w?.prospectId) {
        list = list.filter((a) => a.prospectId === w.prospectId);
      }
      if (w?.statut) {
        list = list.filter((a) => a.statut === w.statut);
      }
      return Promise.resolve(list.length);
    },
    create: ({ data }: { data: Partial<FakeActiviteCrm> }) => {
      const activite: FakeActiviteCrm = {
        id: fakeUuid(),
        prospectId: data.prospectId as string,
        type: data.type as string,
        titre: data.titre as string,
        description: (data.description as string | null) ?? null,
        dateEcheance: data.dateEcheance ? new Date(data.dateEcheance) : null,
        dateRealisation: data.dateRealisation
          ? new Date(data.dateRealisation)
          : null,
        statut: (data.statut as string) ?? 'a_faire',
        priorite: (data.priorite as string) ?? 'moyenne',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.activitesCrm.set(activite.id, activite);
      return Promise.resolve(activite);
    },
    update: ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<FakeActiviteCrm>;
    }) => {
      const existing = this.activitesCrm.get(where.id);
      if (!existing) throw new Error('ActiviteCrm not found (fake prisma)');
      const merged = { ...existing, ...data, updatedAt: new Date() };
      this.activitesCrm.set(where.id, merged);
      return Promise.resolve(merged);
    },
    delete: ({ where }: { where: { id: string } }) => {
      const existing = this.activitesCrm.get(where.id);
      if (!existing) throw new Error('ActiviteCrm not found (fake prisma)');
      this.activitesCrm.delete(where.id);
      return Promise.resolve(existing);
    },
  };

  documentCrm = {
    findFirst: ({ where }: { where: { id: string; prospectId: string } }) => {
      const list = Array.from(this.documentsCrm.values()).filter(
        (d) => d.id === where.id && d.prospectId === where.prospectId,
      );
      return Promise.resolve(list[0] ?? null);
    },
    findMany: ({ where }: { where?: Record<string, unknown> } = {}) => {
      let list = Array.from(this.documentsCrm.values());
      const w = where;
      if (w?.prospectId) {
        list = list.filter((d) => d.prospectId === w.prospectId);
      }
      return Promise.resolve(list);
    },
    create: ({ data }: { data: Partial<FakeDocumentCrm> }) => {
      const doc: FakeDocumentCrm = {
        id: fakeUuid(),
        prospectId: data.prospectId as string,
        type: data.type as string,
        title: (data.title as string | null) ?? null,
        isPublic: (data.isPublic as boolean) ?? false,
        storageKey: data.storageKey as string,
        resourceType: (data.resourceType as string) ?? 'raw',
        url: (data.url as string | null) ?? null,
        version: (data.version as number) ?? 1,
        createdAt: new Date(),
      };
      this.documentsCrm.set(doc.id, doc);
      return Promise.resolve(doc);
    },
    delete: ({ where }: { where: { id: string } }) => {
      const existing = this.documentsCrm.get(where.id);
      if (!existing) throw new Error('DocumentCrm not found (fake prisma)');
      this.documentsCrm.delete(where.id);
      return Promise.resolve(existing);
    },
  };

  dossierVente = {
    findMany: ({ where }: { where?: Record<string, unknown> } = {}) => {
      let list = Array.from(this.dossiersVente.values());
      const w = where;
      if (w?.prospectId) {
        list = list.filter((d) => d.prospectId === w.prospectId);
      }
      return Promise.resolve(list);
    },
  };

  systemSetting = {
    findUnique: ({ where }: { where: { key: string } }) => {
      return Promise.resolve(this.systemSettings.get(where.key) ?? null);
    },
    upsert: ({
      where,
      create,
    }: {
      where: { key: string };
      create: Partial<FakeSystemSetting>;
    }) => {
      const existing = this.systemSettings.get(where.key);
      const merged: FakeSystemSetting = {
        ...create,
        id: existing?.id ?? fakeUuid(),
        key: where.key,
        createdAt: existing?.createdAt ?? new Date(),
        updatedAt: new Date(),
      } as FakeSystemSetting;
      this.systemSettings.set(where.key, merged);
      return Promise.resolve(merged);
    },
  };

  // Utilisé par HealthService — simule une base disponible.
  $queryRaw = () => Promise.resolve([{ '?column?': 1 }]);

  $transaction = (ops: Promise<unknown>[]) => Promise.all(ops);
}
