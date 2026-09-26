import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { hasAnyRole, hasSupervisionScope } from '../rbac/role-groups';

/** Utilisateur authentifié réduit à ce qui décide de son périmètre. */
export type ConstructionUser = {
  id: string;
  roles: string[];
  permissions?: string[];
};

/**
 * Rôles pouvant conduire un chantier. Le responsable construction pilote le
 * service ; l'encadrement suit les dossiers de bout en bout.
 */
export const CHANTIER_ROLES = [
  'responsable_construction',
  'manager',
  'direction',
  'administrateur',
] as const;

/**
 * Règles de périmètre des chantiers, alignées sur celles des démarches : un
 * conducteur de travaux ne voit que les chantiers dont il est responsable,
 * l'encadrement et le responsable construction voient tout.
 */
@Injectable()
export class ConstructionAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /** Vue « tous chantiers » : encadrement et responsable construction. */
  isManager(user: ConstructionUser): boolean {
    return hasSupervisionScope(user, 'construction', [
      'responsable_construction',
    ]);
  }

  ownershipFilter(user: ConstructionUser) {
    if (this.isManager(user)) return {};
    return { responsableId: user.id };
  }

  async ensureAccessible(id: string, user: ConstructionUser): Promise<void> {
    const projet = await this.prisma.projetConstruction.findFirst({
      where: { id, ...this.ownershipFilter(user) },
      select: { id: true },
    });
    if (!projet) throw new NotFoundException('Chantier introuvable');
  }

  /**
   * Responsable d'un chantier : un collaborateur ne peut s'attribuer que
   * lui-même ; l'encadrement désigne qui il veut parmi les rôles habilités.
   */
  async resolveResponsable(
    demande: string | undefined,
    user: ConstructionUser,
  ): Promise<string> {
    if (!demande || demande === user.id) return user.id;
    if (!this.isManager(user)) {
      throw new BadRequestException(
        'Vous ne pouvez pas confier ce chantier à quelqu’un d’autre',
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
        CHANTIER_ROLES,
      )
    ) {
      throw new BadRequestException(
        'Ce collaborateur ne peut pas conduire un chantier',
      );
    }
    return demande;
  }
}
