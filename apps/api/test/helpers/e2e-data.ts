import * as bcrypt from 'bcrypt';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../src/database/prisma.service';

/**
 * Fabrique de données pour les scénarios e2e, sur la vraie base.
 *
 * Les méthodes reprennent le vocabulaire des anciens doubles in-memory
 * (`seedRole`, `seedUser`, `linkUserRole`…) pour que les scénarios se
 * lisent de la même façon — mais chaque appel écrit réellement en base.
 */
export class E2eData {
  constructor(readonly prisma: PrismaService) {}

  /** Idempotent : les noms de rôle sont uniques en base, un scénario peut en redemander un. */
  seedRole(name: string, isSystem = false) {
    return this.prisma.role.upsert({
      where: { name },
      update: {},
      create: { name, isSystem },
    });
  }

  /** Idempotent, comme seedRole. */
  seedPermission(name: string) {
    const [resource, action] = name.split(':');
    return this.prisma.permission.upsert({
      where: { name },
      update: {},
      create: { name, resource, action },
    });
  }

  async linkRolePermission(
    roleId: string,
    permissionId: string,
  ): Promise<void> {
    await this.prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId, permissionId } },
      update: {},
      create: { roleId, permissionId },
    });
  }

  async linkUserRole(userId: string, roleId: string): Promise<void> {
    await this.prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId } },
      update: {},
      create: { userId, roleId },
    });
  }

  /** Crée un rôle porteur des permissions données, en une fois. */
  async seedRoleWithPermissions(
    name: string,
    permissionNames: string[],
    isSystem = false,
  ) {
    const role = await this.seedRole(name, isSystem);
    for (const permissionName of permissionNames) {
      const permission = await this.seedPermission(permissionName);
      await this.linkRolePermission(role.id, permission.id);
    }
    return role;
  }

  /**
   * Utilisateur avec mot de passe déjà haché. Le coût bcrypt est réduit à 4 :
   * on teste le parcours, pas la résistance du hachage.
   */
  async seedUser(
    partial: Partial<Prisma.UserUncheckedCreateInput> & {
      email: string;
      password: string;
    },
  ) {
    return this.prisma.user.create({
      data: {
        firstName: 'Test',
        lastName: 'User',
        ...partial,
        password: partial.password.startsWith('$2')
          ? partial.password
          : await bcrypt.hash(partial.password, 4),
      },
    });
  }

  seedSystemSetting(
    partial: Partial<Prisma.SystemSettingUncheckedCreateInput> & {
      key: string;
      value: Prisma.InputJsonValue;
    },
  ) {
    return this.prisma.systemSetting.upsert({
      where: { key: partial.key },
      update: { value: partial.value },
      create: { isSensitive: false, ...partial },
    });
  }

  seedProprietaire(
    partial: Partial<Prisma.ProprietaireUncheckedCreateInput> = {},
  ) {
    return this.prisma.proprietaire.create({
      data: { firstName: 'Proprietaire', lastName: 'Test', ...partial },
    });
  }

  createContact(
    partial: Partial<Prisma.ContactUncheckedCreateInput> & {
      nom: string;
      email: string;
      message: string;
    },
  ) {
    return this.prisma.contact.create({ data: partial });
  }

  /** Raccourci : le délégué terrain de la vraie base. */
  get terrain() {
    return this.prisma.terrain;
  }
}
