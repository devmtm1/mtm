import { ConflictException, Injectable } from '@nestjs/common';
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

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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

  async changePassword(userId: string, hashedPassword: string): Promise<User> {
    return await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword, mustChangePassword: false },
    });
  }

  // ============================================================
  // CRUD utilisateurs (administration)
  // ============================================================

  async create(dto: CreateUserDto): Promise<UserWithRoles> {
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

  async findAll(): Promise<UserWithRoles[]> {
    return await this.prisma.user.findMany({
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

  async update(userId: string, dto: UpdateUserDto): Promise<UserWithRoles> {
    const data: { email?: string; firstName?: string; lastName?: string; password?: string } = {};
    if (dto.email) data.email = dto.email;
    if (dto.firstName) data.firstName = dto.firstName;
    if (dto.lastName) data.lastName = dto.lastName;
    if (dto.password) data.password = await bcrypt.hash(dto.password, 12);
    await this.prisma.user.update({ where: { id: userId }, data });
    if (dto.roleId) {
      await this.prisma.userRole.deleteMany({ where: { userId } });
      await this.prisma.userRole.create({ data: { userId, roleId: dto.roleId } });
    }
    return (await this.findById(userId))!;
  }

  async remove(userId: string): Promise<void> {
    await this.prisma.user.delete({ where: { id: userId } });
  }

  async setActive(userId: string, isActive: boolean): Promise<User> {
    return await this.prisma.user.update({
      where: { id: userId },
      data: { isActive },
    });
  }

  // ============================================================
  // Attribution de rôles
  // ============================================================

  async assignRole(userId: string, roleId: string): Promise<void> {
    await this.prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId } },
      update: {},
      create: { userId, roleId },
    });
  }

  async removeRole(userId: string, roleId: string): Promise<void> {
    await this.prisma.userRole.deleteMany({
      where: { userId, roleId },
    });
  }
}
