import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  COMMERCIAL_ROLES,
  hasAnyRole,
  hasSupervisionScope,
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

  ownershipFilter(user?: {
    id?: string;
    roles?: string[];
    permissions?: string[];
  }) {
    if (!user || this.hasGlobalScope(user)) return {};
    return { commercialResponsableId: user.id };
  }

  hasGlobalScope(user: { roles?: string[]; permissions?: string[] }): boolean {
    // Le comptable consulte tous les terrains (prix d'acquisition, marges)
    // sans en porter aucun, comme pour les dossiers de vente.
    return hasSupervisionScope(
      { roles: user.roles ?? [], permissions: user.permissions },
      'terrains',
      ['comptable'],
    );
  }

  /**
   * Commercial responsable d'un terrain : un commercial ne peut se désigner
   * que lui-même ; l'encadrement peut désigner tout utilisateur actif ayant
   * un rôle commercial. Renvoie l'identifiant à enregistrer.
   */
  async resolveResponsable(
    requested: string | undefined,
    user: { id: string; roles: string[]; permissions: string[] },
  ): Promise<string> {
    if (!requested || requested === user.id) return user.id;
    if (!this.hasGlobalScope(user)) {
      throw new BadRequestException(
        'Seul un responsable peut affecter un terrain à un autre commercial',
      );
    }
    const target = await this.prisma.user.findUnique({
      where: { id: requested },
      include: { roles: { include: { role: { select: { name: true } } } } },
    });
    if (!target || !target.isActive) {
      throw new BadRequestException('Commercial cible introuvable ou inactif');
    }
    if (
      !hasAnyRole(
        target.roles.map((ur) => ur.role.name),
        COMMERCIAL_ROLES,
      )
    ) {
      throw new BadRequestException(
        "L'utilisateur cible n'a pas de rôle commercial",
      );
    }
    return requested;
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
