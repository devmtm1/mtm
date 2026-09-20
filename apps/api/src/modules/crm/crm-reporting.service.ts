import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CrmAccessService, type CrmUser } from './crm-access.service';
import { PIPELINE_CLOSED_STAGES } from './crm-options.service';

/**
 * Lecture transversale du CRM : liste des commerciaux, statistiques du
 * pipeline (vue manager), chronologie et historique d'audit d'un prospect.
 */
@Injectable()
export class CrmReportingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CrmAccessService,
  ) {}

  async getCommercials() {
    const commercialRoles = await this.prisma.role.findMany({
      where: {
        name: {
          in: [
            'commercial',
            'responsable_commercial',
            'manager',
            'administrateur',
          ],
        },
      },
      select: { id: true },
    });
    const roleIds = commercialRoles.map((r) => r.id);
    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        roles: { some: { roleId: { in: roleIds } } },
      },
      include: {
        roles: {
          where: { roleId: { in: roleIds } },
          include: { role: { select: { name: true } } },
        },
      },
      orderBy: { lastName: 'asc' },
    });
    return users.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      roles: u.roles.map((ur) => ur.role.name),
    }));
  }

  /**
   * Indicateurs du parcours commercial (section 11 du cahier CRM). Le
   * commercial voit les siens, l'encadrement voit ceux de toute l'équipe et
   * le détail par commercial.
   */
  async getStats(user: CrmUser) {
    const isManager = this.access.isManager(user);
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const baseWhere: Prisma.ProspectWhereInput = isManager
      ? {}
      : { commercialResponsableId: user.id };
    const actifs: Prisma.ProspectWhereInput = {
      ...baseWhere,
      statutPipeline: { notIn: [...PIPELINE_CLOSED_STAGES] },
    };
    const prospectScope = isManager
      ? undefined
      : { commercialResponsableId: user.id };

    const [
      pipeline,
      totalProspects,
      nouveaux,
      aContacter,
      relancesDuJour,
      relancesEnRetard,
      sansProchaineAction,
      visitesProgrammees,
      visitesRealisees,
      retoursASaisir,
      upcomingTasksCount,
      ventes,
    ] = await Promise.all([
      this.prisma.prospect.groupBy({
        by: ['statutPipeline'],
        where: baseWhere,
        _count: { statutPipeline: true },
      }),
      this.prisma.prospect.count({ where: baseWhere }),
      this.prisma.prospect.count({
        where: { ...baseWhere, statutPipeline: 'nouveau' },
      }),
      this.prisma.prospect.count({
        where: {
          ...baseWhere,
          statutPipeline: { in: ['nouveau', 'contacte'] },
        },
      }),
      this.prisma.prospect.count({
        where: { ...actifs, prochaineRelanceLe: { lte: endOfDay } },
      }),
      this.prisma.prospect.count({
        where: { ...actifs, prochaineRelanceLe: { lt: startOfDay } },
      }),
      this.prisma.prospect.count({
        where: { ...actifs, prochaineRelanceLe: null },
      }),
      this.prisma.visiteProspect.count({
        where: {
          statut: { in: ['proposee', 'programmee'] },
          dateConfirmee: { gte: startOfDay },
          prospect: prospectScope,
        },
      }),
      this.prisma.visiteProspect.count({
        where: { statut: 'effectuee', prospect: prospectScope },
      }),
      // Règle du cahier des charges : après chaque visite, un retour doit
      // être enregistré — voici celles qui l'attendent encore.
      this.prisma.visiteProspect.count({
        where: {
          statut: { in: ['proposee', 'programmee'] },
          dateConfirmee: { lt: startOfDay },
          dateRetour: null,
          prospect: prospectScope,
        },
      }),
      this.prisma.activiteCrm.count({
        where: {
          statut: 'a_faire',
          dateEcheance: { gte: now },
          prospect: prospectScope,
        },
      }),
      // Montant réalisé : prix des dossiers soldés portés par ces prospects.
      this.prisma.dossierVente.aggregate({
        where: { statut: 'solde', prospect: baseWhere },
        _sum: { prixVente: true },
        _count: { _all: true },
      }),
    ]);

    const byStage = pipeline.reduce<Record<string, number>>((acc, item) => {
      acc[item.statutPipeline] = item._count.statutPipeline;
      return acc;
    }, {});
    const count = (stage: string) => byStage[stage] ?? 0;
    const ventesConclues = count('vente');
    const perdus = count('refuse') + count('abandonne') + count('injoignable');
    const termines = ventesConclues + perdus;

    return {
      totalProspects,
      nouveaux,
      aContacter,
      relancesDuJour,
      relancesEnRetard,
      sansProchaineAction,
      visitesProgrammees,
      visitesRealisees,
      retoursASaisir,
      enReflexion: count('en_reflexion'),
      negociations: count('negociation'),
      reservations: count('reservation'),
      ventesConclues,
      montantVentes: Number(ventes._sum.prixVente ?? 0),
      dossiersSoldes: ventes._count._all,
      // Taux de conversion : ventes rapportées aux parcours terminés, la
      // seule base qui ne se dégrade pas à chaque nouveau prospect entrant.
      tauxConversion:
        termines > 0 ? Math.round((ventesConclues / termines) * 100) : 0,
      upcomingTasksCount,
      pipeline: byStage,
      parCommercial: isManager ? await this.getPerformanceParCommercial() : [],
    };
  }

  /**
   * Export CSV des prospects (section 13 du cahier des charges CRM).
   *
   * Données personnelles de clients : permission dédiée `crm:exporter`,
   * justification obligatoire et trace dans le journal d'audit, comme pour
   * l'export des dossiers de vente. Le périmètre reste celui de
   * l'utilisateur : un commercial n'exporte que ses prospects.
   */
  async exportCsv(user: CrmUser, justification: string): Promise<string> {
    const isManager = this.access.isManager(user);
    const prospects = await this.prisma.prospect.findMany({
      where: isManager ? {} : { commercialResponsableId: user.id },
      include: {
        commercialResponsable: {
          select: { firstName: true, lastName: true },
        },
        terrainChoisi: { select: { referenceInterne: true } },
        _count: { select: { visites: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const header = [
      'reference',
      'nom',
      'prenom',
      'telephone',
      'whatsapp',
      'email',
      'ville_residence',
      'source',
      'niveau_interet',
      'statut',
      'commercial',
      'zone_recherchee',
      'budget_max',
      'prochaine_action',
      'prochaine_relance',
      'visites',
      'terrain_choisi',
      'prix_negocie',
      'motif_sortie',
      'cree_le',
    ];
    const rows = prospects.map((prospect) => [
      prospect.referenceInterne ?? '',
      prospect.nom,
      prospect.prenom ?? '',
      prospect.telephone ?? '',
      prospect.whatsapp ? 'oui' : 'non',
      prospect.email ?? '',
      prospect.villeResidence ?? '',
      prospect.sourceAcquisition ?? '',
      prospect.niveauInteret ?? '',
      prospect.statutPipeline,
      [
        prospect.commercialResponsable?.firstName,
        prospect.commercialResponsable?.lastName,
      ]
        .filter(Boolean)
        .join(' '),
      prospect.zoneRecherchee ?? '',
      prospect.budgetMax === null ? '' : String(prospect.budgetMax),
      prospect.prochaineAction ?? '',
      prospect.prochaineRelanceLe
        ? prospect.prochaineRelanceLe.toISOString().slice(0, 10)
        : '',
      String(prospect._count.visites),
      prospect.terrainChoisi?.referenceInterne ?? '',
      prospect.prixNegocie === null ? '' : String(prospect.prixNegocie),
      prospect.motifSortie ?? '',
      prospect.createdAt.toISOString().slice(0, 10),
    ]);

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'prospect.exported',
        entityType: 'Prospect',
        justification,
        newValue: { lignes: rows.length },
      },
    });

    return [header, ...rows]
      .map((row) => row.map((cell) => this.csvCell(cell)).join(';'))
      .join('\n');
  }

  /** Échappement CSV : séparateur point-virgule, guillemets doublés. */
  private csvCell(value: string): string {
    const needsQuotes = /[";\n\r]/.test(value);
    const escaped = value.split('"').join('""');
    return needsQuotes ? `"${escaped}"` : escaped;
  }

  /** Performance par commercial : volume, ventes et montant réalisé. */
  private async getPerformanceParCommercial() {
    const [prospects, ventes, commercials] = await Promise.all([
      this.prisma.prospect.groupBy({
        by: ['commercialResponsableId', 'statutPipeline'],
        _count: { _all: true },
      }),
      this.prisma.dossierVente.groupBy({
        by: ['commercialResponsableId'],
        where: { statut: 'solde' },
        _sum: { prixVente: true },
        _count: { _all: true },
      }),
      this.getCommercials(),
    ]);

    return commercials
      .map((commercial) => {
        const lignes = prospects.filter(
          (p) => p.commercialResponsableId === commercial.id,
        );
        const total = lignes.reduce((sum, l) => sum + l._count._all, 0);
        const stage = (name: string) =>
          lignes
            .filter((l) => l.statutPipeline === name)
            .reduce((sum, l) => sum + l._count._all, 0);
        const ventesConclues = stage('vente');
        const termines =
          ventesConclues +
          stage('refuse') +
          stage('abandonne') +
          stage('injoignable');
        const vente = ventes.find(
          (v) => v.commercialResponsableId === commercial.id,
        );
        return {
          id: commercial.id,
          nom: `${commercial.firstName} ${commercial.lastName}`.trim(),
          prospects: total,
          enCours: total - termines,
          ventesConclues,
          montantVentes: Number(vente?._sum.prixVente ?? 0),
          tauxConversion:
            termines > 0 ? Math.round((ventesConclues / termines) * 100) : 0,
        };
      })
      .filter((ligne) => ligne.prospects > 0 || ligne.ventesConclues > 0)
      .sort((a, b) => b.montantVentes - a.montantVentes);
  }

  async getTimeline(prospectId: string, user: CrmUser) {
    await this.access.assertOwnership(prospectId, user);
    await this.access.ensureExists(prospectId);
    const [prospect, activites, audits, dossiers] = await Promise.all([
      this.prisma.prospect.findUnique({
        where: { id: prospectId },
        include: {
          commercialResponsable: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.activiteCrm.findMany({
        where: { prospectId },
        orderBy: [{ dateEcheance: 'asc' }],
      }),
      this.prisma.auditLog.findMany({
        where: { entityType: 'Prospect', entityId: prospectId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.dossierVente.findMany({
        where: { prospectId },
        orderBy: { createdAt: 'desc' },
        include: {
          terrain: { select: { id: true, referenceInterne: true, nom: true } },
          mandat: { select: { id: true, referenceInterne: true } },
        },
      }),
    ]);

    const upcoming = activites
      .filter(
        (a) =>
          a.statut === 'a_faire' &&
          a.dateEcheance &&
          a.dateEcheance >= new Date(),
      )
      .sort((a, b) => a.dateEcheance!.getTime() - b.dateEcheance!.getTime())
      .slice(0, 5);

    const overdue = activites
      .filter(
        (a) =>
          a.statut === 'a_faire' &&
          a.dateEcheance &&
          a.dateEcheance < new Date(),
      )
      .sort((a, b) => b.dateEcheance!.getTime() - a.dateEcheance!.getTime())
      .slice(0, 5);

    return {
      prospect,
      upcoming,
      overdue,
      activites,
      audits,
      dossiers,
    };
  }

  async getHistory(prospectId: string, user: CrmUser) {
    await this.access.assertOwnership(prospectId, user);
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { entityType: 'Prospect', entityId: prospectId },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.auditLog.count({
        where: { entityType: 'Prospect', entityId: prospectId },
      }),
    ]);
    return { items, total };
  }
}
