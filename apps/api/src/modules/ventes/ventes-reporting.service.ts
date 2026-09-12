import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { VentesAccessService, type MandatUser } from './ventes-access.service';
import { VentesService } from './ventes.service';

/**
 * Tableau de bord commercial et export (J1.6) : indicateurs globaux,
 * performance par commercial, export CSV tracé.
 */
@Injectable()
export class VentesReportingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: VentesAccessService,
    private readonly ventes: VentesService,
  ) {}

  /**
   * Export CSV des dossiers de vente (tableau de bord commercial, J1.6).
   *
   * Données sensibles (section 24) : permission dédiée `ventes:exporter`,
   * justification obligatoire, et l'export lui-même est tracé dans le
   * journal d'audit — même règle que l'export des journaux. Les montants ne
   * sont inclus que si l'utilisateur peut voir les données financières.
   */
  async exportCsv(user: MandatUser, justification: string): Promise<string> {
    const dossiers = await this.ventes.findAll(user);
    const financials = this.access.canViewFinancials(user);

    const header = [
      'reference',
      'statut',
      'client',
      'email_client',
      'terrain_reference',
      'terrain',
      'mandat',
      'commercial',
      ...(financials ? ['prix_vente', 'montant_paye', 'solde_restant'] : []),
      'cree_le',
    ];
    const rows = dossiers.map((dossier) => {
      const client = [dossier.prospect?.prenom, dossier.prospect?.nom]
        .filter(Boolean)
        .join(' ');
      const commercial = [
        dossier.commercialResponsable?.firstName,
        dossier.commercialResponsable?.lastName,
      ]
        .filter(Boolean)
        .join(' ');
      return [
        dossier.referenceInterne ?? '',
        dossier.statut,
        client,
        dossier.prospect?.email ?? '',
        dossier.terrain?.referenceInterne ?? '',
        dossier.terrain?.nom ?? '',
        dossier.mandat?.referenceInterne ?? '',
        commercial,
        ...(financials
          ? [
              dossier.prixVente === null ? '' : String(dossier.prixVente),
              String(dossier.montantPaye ?? ''),
              String(dossier.soldeRestant ?? ''),
            ]
          : []),
        dossier.createdAt.toISOString().slice(0, 10),
      ];
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'vente.exported',
        entityType: 'DossierVente',
        newValue: { lignes: rows.length, financier: financials },
        justification,
      },
    });

    // Séparateur « ; » : Excel en français l'ouvre directement en colonnes.
    const escape = (value: string): string =>
      /[;"\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
    return [header, ...rows]
      .map((row) => row.map(escape).join(';'))
      .join('\r\n');
  }

  async getDashboardStats(user: MandatUser) {
    const where = this.access.ownershipFilter(user);
    const canViewFinancials = this.access.canViewFinancials(user);
    const [
      totalDossiers,
      dossiersParStatut,
      totalPaiementsValides,
      totalCommissionsEstimees,
      totalCommissionsValidees,
      totalCommissionsPayees,
      ventesRecentes,
    ] = await Promise.all([
      this.prisma.dossierVente.count({ where }),
      this.prisma.dossierVente.groupBy({
        by: ['statut'],
        where,
        _count: { statut: true },
      }),
      this.prisma.paiement.aggregate({
        where: { dossierVente: where, statut: 'valide' },
        _sum: { montant: true },
      }),
      this.prisma.commissionVente.aggregate({
        where: { dossierVente: where, statut: 'estimee' },
        _sum: { montantEstime: true },
      }),
      this.prisma.commissionVente.aggregate({
        where: { dossierVente: where, statut: 'validee' },
        _sum: { montantValide: true },
      }),
      this.prisma.commissionVente.aggregate({
        where: { dossierVente: where, statut: 'payee' },
        _sum: { montantPaye: true },
      }),
      this.prisma.dossierVente.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          referenceInterne: true,
          statut: true,
          prixVente: true,
          createdAt: true,
          prospect: { select: { nom: true, prenom: true } },
          terrain: { select: { nom: true } },
        },
      }),
    ]);

    return {
      totalDossiers,
      dossiersParStatut: dossiersParStatut.reduce<Record<string, number>>(
        (acc, item) => {
          acc[item.statut] = item._count.statut;
          return acc;
        },
        {},
      ),
      totalPaiementsValides: canViewFinancials
        ? Number(totalPaiementsValides._sum.montant ?? 0)
        : 0,
      totalCommissionsEstimees: canViewFinancials
        ? Number(totalCommissionsEstimees._sum.montantEstime ?? 0)
        : 0,
      totalCommissionsValidees: canViewFinancials
        ? Number(totalCommissionsValidees._sum.montantValide ?? 0)
        : 0,
      totalCommissionsPayees: canViewFinancials
        ? Number(totalCommissionsPayees._sum.montantPaye ?? 0)
        : 0,
      ventesRecentes,
    };
  }

  async getCommercialPerformance(commercialId: string, user: MandatUser) {
    if (!this.access.hasGlobalScope(user.roles) && commercialId !== user.id) {
      throw new ForbiddenException(
        "Accès refusé aux performances d'un autre commercial",
      );
    }
    const canViewFinancials = this.access.canViewFinancials(user);
    const where = { commercialResponsableId: commercialId };
    const [totalDossiers, dossiersParStatut, totalPaiements, totalCommissions] =
      await Promise.all([
        this.prisma.dossierVente.count({ where }),
        this.prisma.dossierVente.groupBy({
          by: ['statut'],
          where,
          _count: { statut: true },
        }),
        this.prisma.paiement.aggregate({
          where: { dossierVente: where, statut: 'valide' },
          _sum: { montant: true },
        }),
        this.prisma.commissionVente.aggregate({
          where: { commercialId, statut: 'payee' },
          _sum: { montantPaye: true },
        }),
      ]);

    return {
      commercialId,
      totalDossiers,
      dossiersParStatut: dossiersParStatut.reduce<Record<string, number>>(
        (acc, item) => {
          acc[item.statut] = item._count.statut;
          return acc;
        },
        {},
      ),
      totalPaiements: canViewFinancials
        ? Number(totalPaiements._sum.montant ?? 0)
        : 0,
      totalCommissionsPayees: canViewFinancials
        ? Number(totalCommissions._sum.montantPaye ?? 0)
        : 0,
    };
  }
}
