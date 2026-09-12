import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  hasAnyRole,
  SUPERVISION_ROLES,
  PUBLISHER_ROLES,
} from '../rbac/role-groups';

/**
 * Règles de périmètre et de publication des terrains, partagées par les
 * services du module : un commercial ne voit que ses terrains ; publier un
 * média ou un document exige la permission dédiée (section 24 CDC).
 */
@Injectable()
export class TerrainsAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureAccessible(
    id: string,
    user: { roles: string[]; permissions: string[] },
  ): Promise<void> {
    const terrain = await this.prisma.terrain.findFirst({
      where: { id, ...this.ownershipFilter(user) },
      select: { id: true },
    });
    if (!terrain) throw new NotFoundException('Terrain introuvable');
  }

  ownershipFilter(user?: { id?: string; roles?: string[] }) {
    if (!user || this.hasGlobalScope(user.roles ?? [])) return {};
    return { commercialResponsableId: user.id };
  }

  hasGlobalScope(roles: string[]): boolean {
    return hasAnyRole(roles, SUPERVISION_ROLES);
  }

  assertCanPublish(
    isPublic: boolean | undefined,
    user: { roles: string[]; permissions: string[] },
  ): void {
    if (
      isPublic &&
      !hasAnyRole(user.roles, PUBLISHER_ROLES) &&
      !user.permissions.includes('terrains:publier')
    ) {
      throw new BadRequestException(
        'La publication nécessite la permission terrains:publier',
      );
    }
  }
}
