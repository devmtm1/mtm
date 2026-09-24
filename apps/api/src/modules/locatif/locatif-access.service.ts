import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { hasAnyRole, hasSupervisionScope } from '../rbac/role-groups';

/** Utilisateur authentifié réduit à ce qui décide de son périmètre. */
export type LocatifUser = {
  id: string;
  roles: string[];
  permissions?: string[];
};

/** Rôles pouvant porter un bien locatif. */
export const LOCATIF_ROLES = [
  'responsable_gestion_locative',
  'manager',
  'direction',
  'administrateur',
] as const;

/**
 * Règles de périmètre de la gestion locative (J2.1, section 15 du cahier
 * des charges).
 *
 * Même principe que les démarches et le CRM : un collaborateur ne voit que
 * les biens dont il est responsable ; le responsable gestion locative et
 * l'encadrement voient tout le portefeuille.
 */
@Injectable()
export class LocatifAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Vue « tout le portefeuille ». Le comptable en fait partie : la section 24
   * lui confie le contrôle des encaissements, qu'il ne peut pas exercer sur un
   * portefeuille vide — même raisonnement que pour les dossiers de vente.
   */
  isManager(user: LocatifUser): boolean {
    return hasSupervisionScope(user, 'locatif', [
      'responsable_gestion_locative',
      'comptable',
    ]);
  }

  ownershipFilter(user: LocatifUser) {
    if (this.isManager(user)) return {};
    return { responsableId: user.id };
  }

  async ensureBienAccessible(
    bienLocatifId: string,
    user: LocatifUser,
  ): Promise<void> {
    const bien = await this.prisma.bienLocatif.findFirst({
      where: { id: bienLocatifId, ...this.ownershipFilter(user) },
      select: { id: true },
    });
    if (!bien) throw new NotFoundException('Bien locatif introuvable');
  }

  /**
   * Un bail n'a pas de responsable propre : il hérite du périmètre de son
   * bien. Renvoie l'identifiant du bien pour éviter un second aller-retour
   * à l'appelant.
   */
  async ensureBailAccessible(
    bailLocatifId: string,
    user: LocatifUser,
  ): Promise<{ bienLocatifId: string }> {
    const bail = await this.prisma.bailLocatif.findUnique({
      where: { id: bailLocatifId },
      select: { id: true, bienLocatifId: true },
    });
    if (!bail) throw new NotFoundException('Bail introuvable');
    await this.ensureBienAccessible(bail.bienLocatifId, user);
    return { bienLocatifId: bail.bienLocatifId };
  }

  /**
   * Responsable d'un bien : un collaborateur ne peut s'attribuer que
   * lui-même ; l'encadrement désigne qui il veut parmi les rôles habilités.
   */
  async resolveResponsable(
    demande: string | undefined,
    user: LocatifUser,
  ): Promise<string> {
    if (!demande || demande === user.id) return user.id;
    if (!this.isManager(user)) {
      throw new BadRequestException(
        'Vous ne pouvez pas confier ce bien à quelqu’un d’autre',
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
        LOCATIF_ROLES,
      )
    ) {
      throw new BadRequestException(
        'Ce collaborateur ne peut pas gérer un bien locatif',
      );
    }
    return demande;
  }
}
