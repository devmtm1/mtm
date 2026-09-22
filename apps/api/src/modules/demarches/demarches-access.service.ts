import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { hasAnyRole, hasSupervisionScope } from '../rbac/role-groups';

/** Utilisateur authentifié réduit à ce qui décide de son périmètre. */
export type DemarchesUser = {
  id: string;
  roles: string[];
  permissions?: string[];
};

/**
 * Rôles pouvant porter une mission de vérification : l'équipe démarches,
 * et les commerciaux qui accompagnent un client de la diaspora sur le
 * terrain.
 */
export const MISSION_ROLES = [
  'responsable_demarches',
  'commercial',
  'responsable_commercial',
  'manager',
  'direction',
  'administrateur',
] as const;

/**
 * Règles de périmètre des missions de vérification foncière.
 *
 * Même principe que le CRM : un collaborateur ne voit que les missions dont
 * il est responsable ; l'encadrement voit tout. Le responsable des démarches
 * pilote le service entier, il a donc la vue complète.
 */
@Injectable()
export class DemarchesAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /** Vue « toutes missions » : encadrement et responsable des démarches. */
  isManager(user: DemarchesUser): boolean {
    return hasSupervisionScope(user, 'demarches', ['responsable_demarches']);
  }

  ownershipFilter(user: DemarchesUser) {
    if (this.isManager(user)) return {};
    return { responsableId: user.id };
  }

  async ensureAccessible(id: string, user: DemarchesUser): Promise<void> {
    const mission = await this.prisma.missionVerification.findFirst({
      where: { id, ...this.ownershipFilter(user) },
      select: { id: true },
    });
    if (!mission) throw new NotFoundException('Mission introuvable');
  }

  /**
   * Responsable d'une mission : un collaborateur ne peut s'attribuer que
   * lui-même ; l'encadrement désigne qui il veut parmi les rôles habilités.
   */
  async resolveResponsable(
    demande: string | undefined,
    user: DemarchesUser,
  ): Promise<string> {
    if (!demande || demande === user.id) return user.id;
    if (!this.isManager(user)) {
      throw new BadRequestException(
        'Vous ne pouvez pas confier cette mission à quelqu’un d’autre',
      );
    }
    const cible = await this.prisma.user.findUnique({
      where: { id: demande },
      include: { roles: { include: { role: { select: { name: true } } } } },
    });
    if (!cible || !cible.isActive) {
      throw new BadRequestException('Collaborateur introuvable ou inactif');
    }
    if (
      !hasAnyRole(
        cible.roles.map((lien) => lien.role.name),
        MISSION_ROLES,
      )
    ) {
      throw new BadRequestException(
        'Ce collaborateur ne peut pas porter une mission de vérification',
      );
    }
    return demande;
  }
}
