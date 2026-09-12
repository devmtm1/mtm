import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  hasAnyRole,
  SUPERVISION_ROLES,
  COMMERCIAL_ROLES,
} from '../rbac/role-groups';

export type CrmUser = { id: string; roles: string[] };

/**
 * Règles de périmètre du CRM, partagées par tous les services du module :
 * un commercial ne voit que ses prospects, un manager voit tout ; un
 * prospect ne peut être affecté qu'à un utilisateur ayant un rôle commercial.
 */
@Injectable()
export class CrmAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /** Vue manager : accès à tous les prospects (direction incluse, section 24). */
  isManager(user: { id: string; roles: string[] }): boolean {
    return hasAnyRole(user.roles, SUPERVISION_ROLES);
  }

  async assertOwnership(
    prospectId: string,
    user: { id: string; roles: string[] },
  ): Promise<void> {
    if (this.isManager(user)) return;
    const prospect = await this.prisma.prospect.findUnique({
      where: { id: prospectId },
      select: { id: true, commercialResponsableId: true },
    });
    if (!prospect || prospect.commercialResponsableId !== user.id) {
      throw new NotFoundException('Prospect introuvable');
    }
  }

  async assertCommercialTarget(commercialResponsableId: string): Promise<void> {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: commercialResponsableId },
      include: { roles: { include: { role: { select: { name: true } } } } },
    });
    if (!targetUser || !targetUser.isActive) {
      throw new BadRequestException('Utilisateur cible introuvable ou inactif');
    }
    const hasCommercialRole = hasAnyRole(
      targetUser.roles.map((ur) => ur.role.name),
      COMMERCIAL_ROLES,
    );
    if (!hasCommercialRole) {
      throw new BadRequestException(
        "L'utilisateur cible n'a pas de rôle commercial",
      );
    }
  }

  async ensureExists(id: string): Promise<void> {
    const exists = await this.prisma.prospect.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Prospect introuvable');
  }
}
