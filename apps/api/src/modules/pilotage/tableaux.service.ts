import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PIPELINE_CLOSED_STAGES } from '../crm/crm-options.service';
import { QueryPeriodeDto } from '../finances/dto/finances.dto';
import { serieMensuelle } from '../finances/finances.calculs';
import { FinancesService } from '../finances/finances.service';
import { FluxFinanciersService } from '../finances/flux.service';
import { hasSupervisionScope } from '../rbac/role-groups';
import { STATUTS_TACHE_OUVERTS } from '../taches/taches.constants';
import { ObjectifsService } from '../ventes/objectifs.service';
import { DossiersBloquesService } from './dossiers-bloques.service';
import {
  UN_JOUR,
  classer,
  derniersMois,
  moisDe,
  nombre,
  serieParMois,
  tauxPourcent,
  variationPourcent,
} from './pilotage.calculs';

export type PilotageUser = {
  id: string;
  roles: string[];
  permissions: string[];
  firstName?: string;
  lastName?: string;
};

const STATUTS_VENTE_OUVERTS = [
  'en_cours',
  'pre_reserve',
  'reserve',
  'paiement_partiel',
];
const STATUTS_CHANTIER_ACTIFS = ['prepare', 'en_cours', 'suspendu'];
const STATUTS_MISSION_TERMINES = ['cloturee', 'abandonnee'];
const ROLES_COMMERCIAUX = ['commercial', 'responsable_commercial'];

const nomComplet = (p?: {
  firstName?: string | null;
  lastName?: string | null;
  prenom?: string | null;
  nom?: string | null;
}): string =>
  [p?.firstName ?? p?.prenom, p?.lastName ?? p?.nom]
    .filter(Boolean)
    .join(' ')
    .trim() || '—';

function debutDuJour(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/**
 * Les trois tableaux de bord de la section 23 : direction (chiffre d'affaires,
 * ventes, locations, performances, alertes, tendances), manager (équipe,
 * objectifs, activité, dossiers bloqués, relances) et commercial (prospects,
 * pipeline, visites, ventes, commissions, tâches).
 */
@Injectable()
export class TableauxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly finances: FinancesService,
    private readonly flux: FluxFinanciersService,
    private readonly bloques: DossiersBloquesService,
    private readonly objectifs: ObjectifsService,
  ) {}

  // ------------------------------------------------------------------
  // Direction
  // ------------------------------------------------------------------

  async direction(query: QueryPeriodeDto) {
    const maintenant = new Date();
    const { du, au } = this.finances.periode(query);
    const duree = au.getTime() - du.getTime();
    const duPrecedent = new Date(du.getTime() - duree);

    const [tableauFinances, ventes, ventesPrecedentes, parcours] =
      await Promise.all([
        this.finances.tableau(query),
        this.ventesSoldees(du, au),
        this.ventesSoldees(duPrecedent, du),
        this.parcoursCommercial(du, au, duPrecedent),
      ]);
    const [locatif, demarches, construction, alertes, tendances] =
      await Promise.all([
        this.locatif(du, au, maintenant),
        this.demarches(du, au, duPrecedent),
        this.construction(),
        this.alertesDirection(maintenant, tableauFinances.operationsEnAttente),
        this.tendances(maintenant),
      ]);

    const parCommercial = new Map<
      string,
      { id: string; nom: string; ventes: number; ca: number }
    >();
    for (const vente of ventes.lignes) {
      if (!vente.commercial) continue;
      const courant = parCommercial.get(vente.commercial.id) ?? {
        id: vente.commercial.id,
        nom: nomComplet(vente.commercial),
        ventes: 0,
        ca: 0,
      };
      courant.ventes += 1;
      courant.ca += vente.prix;
      parCommercial.set(vente.commercial.id, courant);
    }

    return {
      periode: tableauFinances.periode,
      finances: {
        totaux: tableauFinances.totaux,
        precedent: tableauFinances.precedent,
        parActivite: tableauFinances.parActivite,
        aEncaisser: tableauFinances.aEncaisser,
      },
      ventes: {
        soldees: ventes.nombre,
        soldeesPrecedent: ventesPrecedentes.nombre,
        variation: variationPourcent(ventes.nombre, ventesPrecedentes.nombre),
        chiffreAffaires: ventes.chiffreAffaires,
        chiffreAffairesPrecedent: ventesPrecedentes.chiffreAffaires,
        variationCa: variationPourcent(
          ventes.chiffreAffaires,
          ventesPrecedentes.chiffreAffaires,
        ),
        enCours: parcours.dossiersEnCours,
        reservationsActives: parcours.reservationsActives,
        prospectsCrees: parcours.prospectsCrees,
        prospectsCreesPrecedent: parcours.prospectsCreesPrecedent,
        tauxConversion: tauxPourcent(ventes.nombre, parcours.prospectsCrees),
        pipeline: parcours.pipeline,
      },
      locatif,
      demarches,
      construction,
      performances: classer([...parCommercial.values()], (c) => c.ca, 5).map(
        ({ rang, element }) => ({
          rang,
          ...element,
        }),
      ),
      alertes,
      tendances,
    };
  }

  /** Ventes conclues (statut soldé) dont la date de vente tombe dans [du, au[. */
  private async ventesSoldees(du: Date, au: Date) {
    const dossiers = await this.prisma.dossierVente.findMany({
      where: { statut: 'solde', dateVente: { gte: du, lt: au } },
      select: {
        id: true,
        prixVente: true,
        dateVente: true,
        commercialResponsable: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
    const lignes = dossiers.map((d) => ({
      id: d.id,
      prix: nombre(d.prixVente),
      commercial: d.commercialResponsable,
    }));
    return {
      nombre: lignes.length,
      chiffreAffaires: lignes.reduce((somme, l) => somme + l.prix, 0),
      lignes,
    };
  }

  private async parcoursCommercial(du: Date, au: Date, duPrecedent: Date) {
    const [
      dossiersEnCours,
      reservationsActives,
      prospectsCrees,
      prospectsCreesPrecedent,
      etapes,
    ] = await Promise.all([
      this.prisma.dossierVente.count({
        where: { statut: { in: STATUTS_VENTE_OUVERTS } },
      }),
      this.prisma.reservation.count({ where: { statut: 'active' } }),
      this.prisma.prospect.count({ where: { createdAt: { gte: du, lt: au } } }),
      this.prisma.prospect.count({
        where: { createdAt: { gte: duPrecedent, lt: du } },
      }),
      this.prisma.prospect.groupBy({
        by: ['statutPipeline'],
        _count: { _all: true },
      }),
    ]);
    const pipeline: Record<string, number> = {};
    for (const ligne of etapes)
      pipeline[ligne.statutPipeline] = ligne._count._all;
    return {
      dossiersEnCours,
      reservationsActives,
      prospectsCrees,
      prospectsCreesPrecedent,
      pipeline,
    };
  }

  private async locatif(du: Date, au: Date, maintenant: Date) {
    const [biens, echeances, prolonges, sejours] = await Promise.all([
      this.prisma.bienLocatif.groupBy({
        by: ['statut'],
        _count: { _all: true },
      }),
      this.prisma.echeanceLoyer.aggregate({
        where: {
          dateEcheance: { gte: du, lt: au },
          statut: { not: 'annulee' },
        },
        _sum: { montantPrevu: true, montantPaye: true },
      }),
      this.prisma.echeanceLoyer.count({
        where: {
          statut: { in: ['en_retard', 'impayee'] },
          dateEcheance: { lt: new Date(maintenant.getTime() - 30 * UN_JOUR) },
        },
      }),
      this.prisma.sejourLocatif.findMany({
        where: {
          dateArrivee: { gte: du, lt: au },
          statut: { notIn: ['annulee', 'refuse', 'refusee'] },
        },
        select: { nuits: true, montantTotal: true },
      }),
    ]);
    const total = biens.reduce((s, b) => s + b._count._all, 0);
    const loues = biens.find((b) => b.statut === 'loue')?._count._all ?? 0;
    const attendu = nombre(echeances._sum.montantPrevu);
    const encaisse = nombre(echeances._sum.montantPaye);
    return {
      biens: total,
      loues,
      tauxOccupation: tauxPourcent(loues, total),
      loyersAttendus: attendu,
      loyersEncaisses: encaisse,
      tauxRecouvrement: tauxPourcent(encaisse, attendu),
      impayesProlonges: prolonges,
      sejours: {
        nombre: sejours.length,
        nuits: sejours.reduce((s, x) => s + nombre(x.nuits), 0),
        montant: sejours.reduce((s, x) => s + nombre(x.montantTotal), 0),
      },
    };
  }

  private async demarches(du: Date, au: Date, duPrecedent: Date) {
    const [ouvertes, ouvertesPrecedent, actives, decisions] = await Promise.all(
      [
        this.prisma.missionVerification.count({
          where: { dateDemande: { gte: du, lt: au } },
        }),
        this.prisma.missionVerification.count({
          where: { dateDemande: { gte: duPrecedent, lt: du } },
        }),
        this.prisma.missionVerification.count({
          where: { statut: { notIn: STATUTS_MISSION_TERMINES } },
        }),
        this.prisma.missionVerification.groupBy({
          by: ['decision'],
          where: { dateRapport: { gte: du, lt: au }, decision: { not: null } },
          _count: { _all: true },
        }),
      ],
    );
    const parDecision: Record<string, number> = {};
    for (const d of decisions)
      if (d.decision) parDecision[d.decision] = d._count._all;
    return {
      ouvertes,
      ouvertesPrecedent,
      variation: variationPourcent(ouvertes, ouvertesPrecedent),
      actives,
      rapportsRendus: Object.values(parDecision).reduce((s, n) => s + n, 0),
      parDecision,
    };
  }

  private async construction() {
    const [parStatut, alertes, avancement] = await Promise.all([
      this.prisma.projetConstruction.groupBy({
        by: ['statut'],
        _count: { _all: true },
      }),
      this.prisma.projetConstruction.count({
        where: {
          statut: { in: STATUTS_CHANTIER_ACTIFS },
          situationAlerte: { not: 'aucune' },
        },
      }),
      this.prisma.projetConstruction.aggregate({
        where: { statut: 'en_cours' },
        _avg: { avancement: true },
      }),
    ]);
    const actifs = parStatut
      .filter((s) => STATUTS_CHANTIER_ACTIFS.includes(s.statut))
      .reduce((somme, s) => somme + s._count._all, 0);
    return {
      actifs,
      enAlerte: alertes,
      avancementMoyen:
        avancement._avg.avancement === null
          ? null
          : Math.round(nombre(avancement._avg.avancement)),
    };
  }

  private async alertesDirection(
    maintenant: Date,
    operationsEnAttente: number,
  ) {
    const [bloques, mandats, prolonges, chantiers, commissions] =
      await Promise.all([
        this.bloques.compter(maintenant),
        this.prisma.mandat.count({
          where: {
            statut: 'Actif',
            dateFin: {
              gte: maintenant,
              lt: new Date(maintenant.getTime() + 30 * UN_JOUR),
            },
          },
        }),
        this.prisma.echeanceLoyer.count({
          where: {
            statut: { in: ['en_retard', 'impayee'] },
            dateEcheance: { lt: new Date(maintenant.getTime() - 30 * UN_JOUR) },
          },
        }),
        this.prisma.projetConstruction.count({
          where: {
            statut: { in: STATUTS_CHANTIER_ACTIFS },
            situationAlerte: { not: 'aucune' },
          },
        }),
        this.prisma.commissionVente.count({ where: { statut: 'estimee' } }),
      ]);
    return {
      dossiersBloques: bloques,
      mandatsExpirant30Jours: mandats,
      impayesProlonges: prolonges,
      chantiersEnAlerte: chantiers,
      commissionsAValider: commissions,
      operationsAValider: operationsEnAttente,
    };
  }

  /** Les 12 derniers mois : ventes conclues, chiffre d'affaires, revenu et dépenses. */
  private async tendances(maintenant: Date) {
    const mois = derniersMois(12, maintenant);
    const debut = new Date(`${mois[0]}-01T00:00:00.000Z`);
    const fin = new Date(
      Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth() + 1, 1),
    );
    const [dossiers, journal] = await Promise.all([
      this.prisma.dossierVente.findMany({
        where: { statut: 'solde', dateVente: { gte: debut, lt: fin } },
        select: { dateVente: true, prixVente: true },
      }),
      this.flux.collecter(debut, fin),
    ]);
    return {
      ventes: serieParMois(
        mois,
        dossiers,
        (d) => d.dateVente,
        () => 1,
      ),
      chiffreAffaires: serieParMois(
        mois,
        dossiers,
        (d) => d.dateVente,
        (d) => nombre(d.prixVente),
      ),
      finances: serieMensuelle(journal.lignes, debut, fin),
    };
  }

  // ------------------------------------------------------------------
  // Manager
  // ------------------------------------------------------------------

  async manager(query: QueryPeriodeDto, user: PilotageUser) {
    const maintenant = new Date();
    const { du, au } = this.finances.periode(query);
    const periodeObjectif = moisDe(du);
    const equipe = await this.prisma.user.findMany({
      where: {
        isActive: true,
        roles: { some: { role: { name: { in: ROLES_COMMERCIAUX } } } },
      },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
    const ids = equipe.map((u) => u.id);

    const [prospects, relances, visites, ventes, commissions, taches] =
      await Promise.all([
        this.prisma.prospect.groupBy({
          by: ['commercialResponsableId'],
          where: {
            commercialResponsableId: { in: ids },
            statutPipeline: { notIn: [...PIPELINE_CLOSED_STAGES] },
          },
          _count: { _all: true },
        }),
        this.prisma.activiteCrm.findMany({
          where: {
            statut: 'a_faire',
            dateEcheance: { lt: maintenant },
            prospect: { commercialResponsableId: { in: ids } },
          },
          select: { prospect: { select: { commercialResponsableId: true } } },
        }),
        this.prisma.visiteProspect.findMany({
          where: { statut: 'effectuee', dateConfirmee: { gte: du, lt: au } },
          select: {
            accompagnateurId: true,
            prospect: { select: { commercialResponsableId: true } },
          },
        }),
        this.prisma.dossierVente.findMany({
          where: {
            statut: 'solde',
            dateVente: { gte: du, lt: au },
            commercialResponsableId: { in: ids },
          },
          select: { commercialResponsableId: true, prixVente: true },
        }),
        this.prisma.commissionVente.findMany({
          where: { commercialId: { in: ids }, createdAt: { gte: du, lt: au } },
          select: { commercialId: true, montantEstime: true },
        }),
        this.prisma.tache.groupBy({
          by: ['responsableId'],
          where: {
            responsableId: { in: ids },
            statut: { in: [...STATUTS_TACHE_OUVERTS] },
            dateLimite: { lt: maintenant },
          },
          _count: { _all: true },
        }),
      ]);

    const lignes = await Promise.all(
      equipe.map(async (membre) => {
        const progres = await this.objectifs.getProgress(
          membre.id,
          periodeObjectif,
          user,
        );
        const ventesMembre = ventes.filter(
          (v) => v.commercialResponsableId === membre.id,
        );
        return {
          id: membre.id,
          nom: nomComplet(membre),
          prospectsActifs:
            prospects.find((p) => p.commercialResponsableId === membre.id)
              ?._count._all ?? 0,
          relancesEnRetard: relances.filter(
            (r) => r.prospect.commercialResponsableId === membre.id,
          ).length,
          visitesEffectuees: visites.filter(
            (v) =>
              (v.accompagnateurId ?? v.prospect.commercialResponsableId) ===
              membre.id,
          ).length,
          ventesSoldees: ventesMembre.length,
          chiffreAffaires: ventesMembre.reduce(
            (s, v) => s + nombre(v.prixVente),
            0,
          ),
          commissionsEstimees: commissions
            .filter((c) => c.commercialId === membre.id)
            .reduce((s, c) => s + nombre(c.montantEstime), 0),
          tachesEnRetard:
            taches.find((t) => t.responsableId === membre.id)?._count._all ?? 0,
          objectif: progres.objectif,
          realise: progres.realise,
          taux: progres.taux,
        };
      }),
    );

    const cibleVentes = lignes.reduce(
      (s, l) => s + (l.objectif?.cibleVentes ?? 0),
      0,
    );
    const cibleCa = lignes.reduce(
      (s, l) => s + (l.objectif?.cibleChiffreAffaires ?? 0),
      0,
    );
    const realiseVentes = lignes.reduce(
      (s, l) => s + (l.objectif ? l.realise.ventes : 0),
      0,
    );
    const realiseCa = lignes.reduce(
      (s, l) => s + (l.objectif ? l.realise.chiffreAffaires : 0),
      0,
    );

    return {
      periode: {
        du,
        auInclus: new Date(au.getTime() - UN_JOUR),
        objectif: periodeObjectif,
      },
      equipe: lignes,
      objectifs: {
        avecObjectif: lignes.filter((l) => l.objectif).length,
        cibleVentes,
        realiseVentes,
        tauxVentes: tauxPourcent(realiseVentes, cibleVentes),
        cibleChiffreAffaires: cibleCa,
        realiseChiffreAffaires: realiseCa,
        tauxChiffreAffaires: tauxPourcent(realiseCa, cibleCa),
      },
      totaux: {
        prospectsActifs: lignes.reduce((s, l) => s + l.prospectsActifs, 0),
        relancesEnRetard: lignes.reduce((s, l) => s + l.relancesEnRetard, 0),
        visitesEffectuees: lignes.reduce((s, l) => s + l.visitesEffectuees, 0),
        ventesSoldees: lignes.reduce((s, l) => s + l.ventesSoldees, 0),
        chiffreAffaires: lignes.reduce((s, l) => s + l.chiffreAffaires, 0),
        tachesEnRetard: lignes.reduce((s, l) => s + l.tachesEnRetard, 0),
      },
      bloques: await this.bloques.lister(maintenant),
    };
  }

  // ------------------------------------------------------------------
  // Commercial
  // ------------------------------------------------------------------

  async commercial(user: PilotageUser, commercialId?: string) {
    const cible = commercialId ?? user.id;
    // Voir le tableau d'un collègue est réservé à l'encadrement.
    if (cible !== user.id && !hasSupervisionScope(user, 'ventes')) {
      throw new ForbiddenException(
        'Seul l’encadrement consulte le tableau d’un autre commercial',
      );
    }
    const maintenant = new Date();
    const aujourdhui = debutDuJour(maintenant);
    const demain = new Date(aujourdhui.getTime() + UN_JOUR);
    const debutMois = new Date(
      Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), 1),
    );
    const debutAnnee = new Date(Date.UTC(maintenant.getUTCFullYear(), 0, 1));
    const sesProspects = { commercialResponsableId: cible };

    const [
      pipeline,
      relances,
      visitesAVenir,
      visitesFaites,
      dossiers,
      soldees,
      commissions,
      tachesOuvertes,
      evenements,
      utilisateur,
      progres,
    ] = await Promise.all([
      this.prisma.prospect.groupBy({
        by: ['statutPipeline'],
        where: sesProspects,
        _count: { _all: true },
      }),
      this.prisma.activiteCrm.findMany({
        where: {
          statut: 'a_faire',
          dateEcheance: { lt: new Date(demain.getTime() + 7 * UN_JOUR) },
          prospect: sesProspects,
        },
        select: {
          id: true,
          titre: true,
          type: true,
          dateEcheance: true,
          prospect: { select: { id: true, nom: true, prenom: true } },
        },
        orderBy: { dateEcheance: 'asc' },
        take: 60,
      }),
      this.prisma.visiteProspect.findMany({
        where: {
          statut: { in: ['proposee', 'programmee'] },
          OR: [{ accompagnateurId: cible }, { prospect: sesProspects }],
          AND: [
            {
              OR: [
                { dateConfirmee: { gte: aujourdhui } },
                { dateConfirmee: null, dateProposee: { gte: aujourdhui } },
              ],
            },
          ],
        },
        select: {
          id: true,
          dateConfirmee: true,
          dateProposee: true,
          heure: true,
          terrain: { select: { referenceInterne: true, nom: true } },
          prospect: { select: { id: true, nom: true, prenom: true } },
        },
        orderBy: { dateConfirmee: 'asc' },
        take: 5,
      }),
      this.prisma.visiteProspect.count({
        where: {
          statut: 'effectuee',
          dateConfirmee: { gte: debutMois },
          OR: [{ accompagnateurId: cible }, { prospect: sesProspects }],
        },
      }),
      this.prisma.dossierVente.groupBy({
        by: ['statut'],
        where: { commercialResponsableId: cible },
        _count: { _all: true },
      }),
      this.prisma.dossierVente.findMany({
        where: {
          commercialResponsableId: cible,
          statut: 'solde',
          dateVente: { gte: debutMois },
        },
        select: { prixVente: true },
      }),
      this.prisma.commissionVente.findMany({
        where: {
          commercialId: cible,
          statut: { in: ['estimee', 'validee', 'payee'] },
        },
        select: {
          statut: true,
          montantEstime: true,
          montantValide: true,
          montantPaye: true,
          updatedAt: true,
        },
      }),
      this.prisma.tache.findMany({
        where: {
          responsableId: cible,
          statut: { in: [...STATUTS_TACHE_OUVERTS] },
        },
        select: { dateLimite: true },
      }),
      this.prisma.evenementAgenda.findMany({
        where: {
          statut: 'prevu',
          debut: { gte: aujourdhui, lt: demain },
          OR: [
            { createurId: cible },
            { participants: { some: { userId: cible } } },
          ],
        },
        select: {
          id: true,
          titre: true,
          type: true,
          debut: true,
          lieu: true,
          journeeEntiere: true,
        },
        orderBy: { debut: 'asc' },
      }),
      this.prisma.user.findUnique({
        where: { id: cible },
        select: { firstName: true, lastName: true },
      }),
      this.objectifs.getProgress(cible, moisDe(maintenant), user),
    ]);

    const pipelineParEtape: Record<string, number> = {};
    for (const ligne of pipeline)
      pipelineParEtape[ligne.statutPipeline] = ligne._count._all;
    const dossiersParStatut: Record<string, number> = {};
    for (const ligne of dossiers)
      dossiersParStatut[ligne.statut] = ligne._count._all;
    const sommes = (
      statut: string,
      champ: 'montantEstime' | 'montantValide' | 'montantPaye',
      depuis?: Date,
    ) =>
      commissions
        .filter(
          (c) => c.statut === statut && (!depuis || c.updatedAt >= depuis),
        )
        .reduce((total, c) => total + nombre(c[champ]), 0);

    const enRetard = relances.filter(
      (r) => r.dateEcheance && r.dateEcheance < aujourdhui,
    );
    const duJour = relances.filter(
      (r) =>
        r.dateEcheance &&
        r.dateEcheance >= aujourdhui &&
        r.dateEcheance < demain,
    );

    return {
      commercial: { id: cible, nom: nomComplet(utilisateur ?? undefined) },
      pipeline: pipelineParEtape,
      prospectsActifs: Object.entries(pipelineParEtape)
        .filter(
          ([etape]) =>
            !(PIPELINE_CLOSED_STAGES as readonly string[]).includes(etape),
        )
        .reduce((s, [, n]) => s + n, 0),
      relances: {
        enRetard: enRetard.length,
        aujourdhui: duJour.length,
        prochaines: [...enRetard, ...duJour].slice(0, 6).map((r) => ({
          id: r.id,
          titre: r.titre,
          type: r.type,
          echeance: r.dateEcheance,
          enRetard: !!r.dateEcheance && r.dateEcheance < aujourdhui,
          prospect: nomComplet(r.prospect),
          lien: `/crm/prospects/${r.prospect.id}`,
        })),
      },
      visites: {
        effectueesCeMois: visitesFaites,
        aVenir: visitesAVenir.map((v) => ({
          id: v.id,
          date: v.dateConfirmee ?? v.dateProposee,
          heure: v.heure,
          bien: `${v.terrain.referenceInterne} — ${v.terrain.nom}`,
          prospect: nomComplet(v.prospect),
          lien: `/crm/prospects/${v.prospect.id}`,
        })),
      },
      ventes: {
        parStatut: dossiersParStatut,
        ouvertes: STATUTS_VENTE_OUVERTS.reduce(
          (s, statut) => s + (dossiersParStatut[statut] ?? 0),
          0,
        ),
        soldeesCeMois: soldees.length,
        chiffreAffairesCeMois: soldees.reduce(
          (s, d) => s + nombre(d.prixVente),
          0,
        ),
      },
      objectif: {
        periode: progres.periode,
        cibles: progres.objectif,
        realise: progres.realise,
        taux: progres.taux,
      },
      commissions: {
        estimees: sommes('estimee', 'montantEstime'),
        aPayer: sommes('validee', 'montantValide'),
        payeesCetteAnnee: sommes('payee', 'montantPaye', debutAnnee),
      },
      taches: {
        ouvertes: tachesOuvertes.length,
        enRetard: tachesOuvertes.filter(
          (t) => t.dateLimite && t.dateLimite < maintenant,
        ).length,
        aujourdhui: tachesOuvertes.filter(
          (t) =>
            t.dateLimite && t.dateLimite >= aujourdhui && t.dateLimite < demain,
        ).length,
      },
      agenda: evenements,
    };
  }
}
