import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

export type UserWithRoles = User & {
  roles: {
    role: {
      name: string;
      permissions: { permission: { name: string } }[];
    };
  }[];
};

/** Celui qui agit : ses rôles et permissions décident de ce qu'il peut accorder. */
export type UserActor = {
  id: string;
  roles: string[];
  permissions: string[];
};

const ADMIN_ROLE = 'administrateur';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // ------------------------------------------------------------------
  // Garde-fous d'administration (sections 24 et 27 CDC)
  // ------------------------------------------------------------------

  /**
   * On ne peut pas accorder plus de droits qu'on n'en a. Sans cette règle,
   * toute personne autorisée à créer des utilisateurs pouvait se créer, ou
   * créer, un compte administrateur. Les administrateurs sont exemptés.
   */
  async assertCanGrantRole(actor: UserActor, roleId: string): Promise<void> {
    if (actor.roles.includes(ADMIN_ROLE)) return;
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: {
        permissions: { select: { permission: { select: { name: true } } } },
      },
    });
    if (!role) throw new BadRequestException('Rôle introuvable');
    const manquantes = role.permissions
      .map((lien) => lien.permission.name)
      .filter((nom) => !actor.permissions.includes(nom));
    if (manquantes.length > 0) {
      throw new ForbiddenException(
        'Vous ne pouvez pas attribuer un rôle qui donne plus de droits que les vôtres.',
      );
    }
  }

  /**
   * Seul un administrateur touche à un compte administrateur : sinon, un
   * simple droit « modifier un utilisateur » permettrait de réinitialiser son
   * mot de passe ou sa double authentification, donc de le supplanter.
   */
  async assertCanManageTarget(
    actor: UserActor,
    targetId: string,
  ): Promise<void> {
    if (actor.roles.includes(ADMIN_ROLE) || actor.id === targetId) return;
    const cible = await this.prisma.userRole.count({
      where: { userId: targetId, role: { name: ADMIN_ROLE } },
    });
    if (cible > 0) {
      throw new ForbiddenException(
        'Seul un administrateur peut modifier un compte administrateur.',
      );
    }
  }

  /**
   * Garde au moins un administrateur actif : perdre le dernier, c'est perdre
   * l'accès au paramétrage, aux rôles et à la récupération de comptes.
   */
  private async assertNotLastAdmin(userId: string): Promise<void> {
    const estAdmin = await this.prisma.userRole.count({
      where: { userId, role: { name: ADMIN_ROLE } },
    });
    if (estAdmin === 0) return;
    const autres = await this.prisma.user.count({
      where: {
        id: { not: userId },
        isActive: true,
        roles: { some: { role: { name: ADMIN_ROLE } } },
      },
    });
    if (autres === 0) {
      throw new ConflictException(
        'Ce compte est le dernier administrateur actif : désignez-en un autre d’abord.',
      );
    }
  }

  async findByEmail(email: string): Promise<UserWithRoles | null> {
    return await this.prisma.user.findUnique({
      where: { email },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });
  }

  async findById(id: string): Promise<UserWithRoles | null> {
    return await this.prisma.user.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Retourne la liste des noms de permissions (format "resource:action")
   * détenues par l'utilisateur, via l'ensemble de ses rôles.
   */
  getPermissionNames(user: UserWithRoles): string[] {
    const names = new Set<string>();
    for (const userRole of user.roles) {
      for (const rolePermission of userRole.role.permissions) {
        names.add(rolePermission.permission.name);
      }
    }
    return Array.from(names);
  }

  /**
   * Mapping partagé User (avec rôles) -> profil exposable au client
   * (JWT strategy, réponse de login, /auth/me). Ne jamais inclure le
   * hash du mot de passe ni le secret 2FA brut.
   */
  toAuthenticatedUser(user: UserWithRoles): {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
    permissions: string[];
    mustChangePassword: boolean;
    twoFactorEnabled: boolean;
  } {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles.map(
        (userRole: { role: { name: string } }) => userRole.role.name,
      ),
      permissions: this.getPermissionNames(user),
      mustChangePassword: user.mustChangePassword,
      twoFactorEnabled: user.twoFactorEnabled,
    };
  }

  async incrementFailedAttempts(userId: string): Promise<User> {
    return await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: { increment: 1 } },
    });
  }

  async resetFailedAttempts(userId: string): Promise<User> {
    return await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  async lockAccount(userId: string, until: Date): Promise<User> {
    return await this.prisma.user.update({
      where: { id: userId },
      data: { lockedUntil: until },
    });
  }

  async updateLastLogin(userId: string): Promise<User> {
    return await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  async setTwoFactorSecret(userId: string, secret: string): Promise<User> {
    return await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });
  }

  async enableTwoFactor(userId: string): Promise<User> {
    return await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });
  }

  async disableTwoFactor(userId: string): Promise<User> {
    return await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
  }

  async resetTwoFactor(userId: string, actor: UserActor): Promise<User> {
    await this.assertCanManageTarget(actor, userId);
    return await this.disableTwoFactor(userId);
  }

  async changePassword(userId: string, hashedPassword: string): Promise<User> {
    return await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword, mustChangePassword: false },
    });
  }

  // ============================================================
  // CRUD utilisateurs (administration)
  // ============================================================

  async create(dto: CreateUserDto, actor: UserActor): Promise<UserWithRoles> {
    await this.assertCanGrantRole(actor, dto.roleId);
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Un utilisateur avec cet email existe déjà');
    }

    const bcryptSaltRounds = 12;
    const hashedPassword = await bcrypt.hash(dto.password, bcryptSaltRounds);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        // Mot de passe provisoire fixé par un admin : l'utilisateur doit
        // le changer dès sa première connexion.
        mustChangePassword: true,
        roles: {
          create: { roleId: dto.roleId },
        },
      },
    });

    return (await this.findById(user.id))!;
  }

  /**
   * Comptes du personnel uniquement : les comptes « client » (espace client
   * du site public) sont gérés depuis la fiche prospect, pas depuis
   * l'administration des utilisateurs.
   */
  async findAll(): Promise<UserWithRoles[]> {
    return await this.prisma.user.findMany({
      where: {
        OR: [
          { roles: { none: {} } },
          { roles: { some: { role: { name: { not: 'client' } } } } },
        ],
      },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(
    userId: string,
    dto: UpdateUserDto,
    actor: UserActor,
  ): Promise<UserWithRoles> {
    await this.assertCanManageTarget(actor, userId);
    if (dto.roleId) {
      await this.assertCanGrantRole(actor, dto.roleId);
      // Changer le rôle d'un administrateur pour un autre le retire de la
      // liste des administrateurs : même garde que pour sa désactivation.
      const reste = await this.prisma.userRole.count({
        where: { userId, roleId: dto.roleId },
      });
      if (reste === 0) await this.assertNotLastAdmin(userId);
    }
    const data: {
      email?: string;
      firstName?: string;
      lastName?: string;
      password?: string;
      mustChangePassword?: boolean;
    } = {};
    if (dto.email) data.email = dto.email;
    if (dto.firstName) data.firstName = dto.firstName;
    if (dto.lastName) data.lastName = dto.lastName;
    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, 12);
      data.mustChangePassword = true;
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    const roleId = dto.roleId;
    // Un seul bloc : un échec entre la suppression et la création du rôle
    // laisserait le compte sans aucun rôle.
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data });
      if (roleId) {
        await tx.userRole.deleteMany({ where: { userId } });
        await tx.userRole.create({ data: { userId, roleId } });
      }
    });
    return (await this.findById(userId))!;
  }

  async remove(userId: string, actor: UserActor): Promise<void> {
    if (userId === actor.id) {
      throw new ConflictException(
        'Vous ne pouvez pas supprimer votre propre compte.',
      );
    }
    await this.assertCanManageTarget(actor, userId);
    await this.assertNotLastAdmin(userId);
    await this.prisma.user.delete({ where: { id: userId } });
  }

  async setActive(
    userId: string,
    isActive: boolean,
    actor: UserActor,
  ): Promise<User> {
    await this.assertCanManageTarget(actor, userId);
    if (!isActive) {
      if (userId === actor.id) {
        throw new ConflictException(
          'Vous ne pouvez pas désactiver votre propre compte.',
        );
      }
      await this.assertNotLastAdmin(userId);
    }
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive },
    });
    if (!isActive) {
      // Une session ouverte ne doit pas survivre à la désactivation.
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return user;
  }

  // ============================================================
  // Attribution de rôles
  // ============================================================

  async assignRole(
    userId: string,
    roleId: string,
    actor: UserActor,
  ): Promise<void> {
    await this.assertCanManageTarget(actor, userId);
    await this.assertCanGrantRole(actor, roleId);
    await this.prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId } },
      update: {},
      create: { userId, roleId },
    });
  }

  async removeRole(
    userId: string,
    roleId: string,
    actor: UserActor,
  ): Promise<void> {
    await this.assertCanManageTarget(actor, userId);
    const estAdmin = await this.prisma.userRole.count({
      where: { userId, roleId, role: { name: ADMIN_ROLE } },
    });
    if (estAdmin > 0) await this.assertNotLastAdmin(userId);
    await this.prisma.userRole.deleteMany({
      where: { userId, roleId },
    });
  }
}
