import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { hasSupervisionScope } from '../rbac/role-groups';

export type MandatUser = { id: string; roles: string[]; permissions: string[] };

/**
 * Règles de visibilité des dossiers de vente, partagées par tous les services
 * du module : périmètre (un commercial ne voit que ses dossiers, la
 * direction voit tout) et accès aux données financières (section 24 CDC).
 */
@Injectable()
export class VentesAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /** La comptabilité voit aussi tous les dossiers : elle valide et paie. */
  hasGlobalScope(user: MandatUser): boolean {
    return hasSupervisionScope(user, 'ventes', ['comptable']);
  }

  ownershipFilter(user: MandatUser): Prisma.DossierVenteWhereInput {
    if (this.hasGlobalScope(user)) return {};
    return { commercialResponsableId: user.id };
  }

  async ensureAccessible(id: string, user: MandatUser): Promise<void> {
    const exists = await this.prisma.dossierVente.findFirst({
      where: { id, ...this.ownershipFilter(user) },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Dossier de vente introuvable');
  }

  canViewFinancials(user: MandatUser): boolean {
    return (
      this.hasGlobalScope(user) ||
      user.permissions.includes('ventes:consulter_financier')
    );
  }
}
