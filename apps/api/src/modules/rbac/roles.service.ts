import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return await this.prisma.role.findMany({
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { permissions: { include: { permission: true } } },
    });
    if (!role) {
      throw new NotFoundException('Rôle introuvable');
    }
    return role;
  }

  async create(dto: CreateRoleDto): Promise<Role> {
    const existing = await this.prisma.role.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException('Un rôle avec ce nom existe déjà');
    }

    return this.prisma.role.create({
      data: { name: dto.name, description: dto.description },
    });
  }

  async update(id: string, dto: UpdateRoleDto): Promise<Role> {
    await this.findById(id);
    return this.prisma.role.update({
      where: { id },
      data: { description: dto.description },
    });
  }

  async remove(id: string): Promise<void> {
    const role = await this.findById(id);
    if (role.isSystem) {
      throw new BadRequestException(
        'Ce rôle système ne peut pas être supprimé',
      );
    }
    await this.prisma.role.delete({ where: { id } });
  }

  /**
   * Un rôle ne peut recevoir que des droits que celui qui les accorde
   * possède lui-même ; sans cette règle, le détenteur de `roles:administrer`
   * pouvait s'octroyer toutes les permissions via son propre rôle.
   * Les administrateurs sont exemptés.
   */
  async assignPermissions(
    roleId: string,
    permissionNames: string[],
    actor?: { roles: string[]; permissions: string[] },
  ): Promise<void> {
    const role = await this.findById(roleId);
    if (actor && !actor.roles.includes('administrateur')) {
      if (role.name === 'administrateur') {
        throw new ForbiddenException(
          'Seul un administrateur peut modifier le rôle administrateur.',
        );
      }
      const nonDetenues = permissionNames.filter(
        (nom) => !actor.permissions.includes(nom),
      );
      if (nonDetenues.length > 0) {
        throw new ForbiddenException(
          `Vous ne pouvez pas accorder des droits que vous n'avez pas : ${nonDetenues.join(', ')}`,
        );
      }
    }

    const permissions = await this.prisma.permission.findMany({
      where: { name: { in: permissionNames } },
    });

    const foundNames = new Set(
      permissions.map((p: { name: string }) => p.name),
    );
    const missing = permissionNames.filter((name) => !foundNames.has(name));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Permissions inconnues: ${missing.join(', ')}`,
      );
    }

    await this.prisma.$transaction(
      permissions.map((permission: { id: string }) =>
        this.prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: { roleId, permissionId: permission.id },
          },
          update: {},
          create: { roleId, permissionId: permission.id },
        }),
      ),
    );
  }

  async removePermission(
    roleId: string,
    permissionId: string,
    actor?: { roles: string[] },
  ): Promise<void> {
    const role = await this.findById(roleId);
    // Le rôle administrateur garde tous ses droits : en retirer un pourrait
    // fermer l'accès au paramétrage ou à la récupération de comptes.
    if (role.name === 'administrateur') {
      throw new BadRequestException(
        'Les permissions du rôle administrateur ne peuvent pas être retirées.',
      );
    }
    if (actor && !actor.roles.includes('administrateur') && role.isSystem) {
      throw new ForbiddenException(
        'Seul un administrateur peut modifier un rôle système.',
      );
    }
    await this.prisma.rolePermission.deleteMany({
      where: { roleId, permissionId },
    });
  }
}
