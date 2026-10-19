import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  type Activite,
  type LigneJournal,
  LIBELLES_ACTIVITE,
  bornesMois,
  moisDe,
  nombre,
  periodeValide,
  serieMensuelle,
  totaliser,
} from './finances.calculs';
import { FluxFinanciersService } from './flux.service';
import { normaliserMode } from './tresorerie.calculs';
import { QueryJournalDto, QueryPeriodeDto } from './dto/finances.dto';

const UN_JOUR = 24 * 3600 * 1000;
/** Au-delà d'une année, une lecture charge trop de mouvements d'un coup : on exporte par tranches. */
const PERIODE_MAX_JOURS = 366;

export interface Periode {
  du: Date;
  /** Exclu : le lendemain du dernier jour demandé. */
  au: Date;
}

/**
 * Pilotage financier (J3.1) : tableau de bord, journal, ce qu'il reste à
 * encaisser, et clôture mensuelle. Les chiffres viennent du journal
 * (FluxFinanciersService) : aucun total n'est stocké, sauf à la clôture d'un mois.
 */
@Injectable()
export class FinancesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly flux: FluxFinanciersService,
  ) {}

  /** Période demandée : par défaut du 1er du mois à aujourd'hui ; dates inclusives, bornes en UTC. */
  periode(query: QueryPeriodeDto, maintenant = new Date()): Periode {
    const debutMois = new Date(
      Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), 1),
    );
    const du = query.du
      ? new Date(`${query.du.slice(0, 10)}T00:00:00.000Z`)
      : debutMois;
    const dernierJour = query.au
      ? new Date(`${query.au.slice(0, 10)}T00:00:00.000Z`)
      : new Date(
          Date.UTC(
            maintenant.getUTCFullYear(),
            maintenant.getUTCMonth(),
            maintenant.getUTCDate(),
          ),
        );
    const au = new Date(dernierJour.getTime() + UN_JOUR);
    if (!(au > du)) {
      throw new BadRequestException('La fin de la période précède son début');
    }
    if ((au.getTime() - du.getTime()) / UN_JOUR > PERIODE_MAX_JOURS) {
      throw new BadRequestException(
        `La période ne peut pas dépasser ${PERIODE_MAX_JOURS} jours`,
      );
    }
    return { du, au };
  }

  async tableau(query: QueryPeriodeDto) {
    const { du, au } = this.periode(query);
    const collecte = await this.flux.collecter(du, au);
    const { margesInconnues, tauxGestionDefaut } = collecte;
    const filtre = (lignes: LigneJournal[]) =>
      lignes.filter(
        (ligne) =>
          (!query.activite || ligne.activite === query.activite) &&
          (!query.mode ||
            normaliserMode(ligne.mode) === normaliserMode(query.mode)),
      );
    const lignes = filtre(collecte.lignes);
    const { global, parActivite } = totaliser(lignes);

    // Période précédente de même durée : sert à dire si l'on progresse.
    const duree = au.getTime() - du.getTime();
    const precedente = await this.flux.collecter(
      new Date(du.getTime() - duree),
      du,
    );
    const avant = totaliser(filtre(precedente.lignes)).global;

    return {
      periode: { du, auInclus: new Date(au.getTime() - UN_JOUR) },
      totaux: global,
      precedent: avant,
      parActivite: (Object.keys(parActivite) as Activite[]).map((activite) => ({
        activite,
        libelle: LIBELLES_ACTIVITE[activite],
        ...parActivite[activite],
      })),
      serie: serieMensuelle(lignes, du, au),
      margesInconnues,
      tauxGestionDefaut,
      aEncaisser: await this.aEncaisser(),
      operationsEnAttente: await this.prisma.operationFinanciere.count({
        where: { statut: 'en_attente' },
      }),
    };
  }

  async journal(query: QueryJournalDto) {
    const { du, au } = this.periode(query);
    const { lignes } = await this.flux.collecter(du, au);
    const recherche = query.search?.trim().toLowerCase();
    // Un compte reçoit les mouvements qui le nomment, ou dont le mode de paiement est le sien.
    const compte = query.compteId
      ? await this.prisma.compteTresorerie.findUnique({
          where: { id: query.compteId },
          select: { id: true, modes: true },
        })
      : null;
    const dansLeCompte = (ligne: LigneJournal): boolean =>
      !compte ||
      ligne.compteId === compte.id ||
      (!ligne.compteId &&
        compte.modes.some(
          (m) => normaliserMode(m) === normaliserMode(ligne.mode),
        ));
    const filtrees = lignes.filter(
      (ligne) =>
        (!query.activite || ligne.activite === query.activite) &&
        (!query.sens || ligne.sens === query.sens) &&
        (!query.mode ||
          normaliserMode(ligne.mode) === normaliserMode(query.mode)) &&
        (!query.sansJustificatif || ligne.justifie === false) &&
        dansLeCompte(ligne) &&
        (!recherche ||
          [ligne.libelle, ligne.tiers, ligne.reference]
            .filter(Boolean)
            .some((texte) =>
              (texte as string).toLowerCase().includes(recherche),
            )),
    );
    const { global } = totaliser(filtrees);
    // Les plus récents d'abord à l'écran.
    const triees = [...filtrees].sort(
      (a, b) => b.date.getTime() - a.date.getTime(),
    );
    const debut = (query.page - 1) * query.pageSize;
    return {
      items: triees.slice(debut, debut + query.pageSize),
      total: filtrees.length,
      page: query.page,
      pageSize: query.pageSize,
      totaux: global,
    };
  }

  /** Lignes de la période pour un export : de la plus ancienne à la plus récente. */
  async lignesDe(query: QueryPeriodeDto): Promise<{
    lignes: LigneJournal[];
    periode: Periode;
  }> {
    const periode = this.periode(query);
    const { lignes } = await this.flux.collecter(periode.du, periode.au);
    return { lignes, periode };
  }

  /** Ce qui est dû à MTM et pas encore encaissé, et ce qui arrive : à la date du jour. */
  async aEncaisser(maintenant = new Date(), lignesMax = 8) {
    const dans30Jours = new Date(maintenant.getTime() + 30 * UN_JOUR);

    const loyers = await this.prisma.echeanceLoyer.findMany({
      where: {
        dateEcheance: { lt: maintenant },
        statut: { in: ['en_retard', 'impayee', 'partielle', 'a_venir'] },
      },
      select: {
        id: true,
        dateEcheance: true,
        montantPrevu: true,
        montantPaye: true,
        bailLocatif: {
          select: {
            referenceInterne: true,
            bienLocatifId: true,
            locataire: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { dateEcheance: 'asc' },
      take: 200,
    });
    const loyersImpayes = loyers
      .map((e) => ({
        e,
        reste: nombre(e.montantPrevu) - nombre(e.montantPaye),
      }))
      .filter(({ reste }) => reste > 0);

    const ventes = await this.prisma.echeancePaiement.findMany({
      where: {
        dateEcheance: { lt: maintenant },
        statut: { in: ['en_attente', 'partielle'] },
        dossierVente: { statut: { notIn: ['annule', 'solde'] } },
      },
      select: {
        id: true,
        numero: true,
        dateEcheance: true,
        montantPrevu: true,
        montantPaye: true,
        dossierVente: {
          select: {
            id: true,
            referenceInterne: true,
            prospect: { select: { nom: true, prenom: true } },
          },
        },
      },
      orderBy: { dateEcheance: 'asc' },
      take: 200,
    });
    const ventesEnRetard = ventes
      .map((e) => ({
        e,
        reste: nombre(e.montantPrevu) - nombre(e.montantPaye),
      }))
      .filter(({ reste }) => reste > 0);

    const missions = await this.prisma.missionVerification.findMany({
      where: {
        montantDevis: { gt: 0 },
        statut: { not: 'abandonnee' },
      },
      select: {
        id: true,
        referenceInterne: true,
        montantDevis: true,
        montantPaye: true,
        prospect: { select: { nom: true, prenom: true } },
      },
      take: 300,
    });
    const missionsDues = missions
      .map((m) => ({
        m,
        reste: nombre(m.montantDevis) - nombre(m.montantPaye),
      }))
      .filter(({ reste }) => reste > 0);

    const commissionsAPayer = await this.prisma.commissionVente.aggregate({
      where: { statut: 'validee' },
      _sum: { montantValide: true },
      _count: { _all: true },
    });

    const [echeancesVentes, echeancesLoyers] = await Promise.all([
      this.prisma.echeancePaiement.aggregate({
        where: {
          dateEcheance: { gte: maintenant, lt: dans30Jours },
          statut: { in: ['en_attente', 'planifiee', 'partielle'] },
          dossierVente: { statut: { notIn: ['annule', 'solde'] } },
        },
        _sum: { montantPrevu: true, montantPaye: true },
      }),
      this.prisma.echeanceLoyer.aggregate({
        where: {
          dateEcheance: { gte: maintenant, lt: dans30Jours },
          statut: { in: ['a_venir', 'partielle'] },
        },
        _sum: { montantPrevu: true, montantPaye: true },
      }),
    ]);
    const reste30j = (agg: {
      _sum: { montantPrevu: unknown; montantPaye: unknown };
    }) =>
      Math.max(0, nombre(agg._sum.montantPrevu) - nombre(agg._sum.montantPaye));

    const somme = (liste: Array<{ reste: number }>) =>
      liste.reduce((total, ligne) => total + ligne.reste, 0);
    const nomPersonne = (p?: {
      firstName?: string | null;
      lastName?: string | null;
      prenom?: string | null;
      nom?: string | null;
    }) =>
      [p?.firstName ?? p?.prenom, p?.lastName ?? p?.nom]
        .filter(Boolean)
        .join(' ') || null;

    return {
      loyers: {
        total: somme(loyersImpayes),
        nombre: loyersImpayes.length,
        lignes: loyersImpayes.slice(0, lignesMax).map(({ e, reste }) => ({
          id: e.id,
          libelle: `Bail ${e.bailLocatif.referenceInterne}`,
          tiers: nomPersonne(e.bailLocatif.locataire),
          echeance: e.dateEcheance,
          reste,
          lien: `/locatif/biens/${e.bailLocatif.bienLocatifId}`,
        })),
      },
      ventes: {
        total: somme(ventesEnRetard),
        nombre: ventesEnRetard.length,
        lignes: ventesEnRetard.slice(0, lignesMax).map(({ e, reste }) => ({
          id: e.id,
          libelle: `Échéance n°${e.numero} — ${e.dossierVente.referenceInterne ?? 'dossier'}`,
          tiers: nomPersonne(e.dossierVente.prospect),
          echeance: e.dateEcheance,
          reste,
          lien: `/ventes/${e.dossierVente.id}`,
        })),
      },
      missions: {
        total: somme(missionsDues),
        nombre: missionsDues.length,
        lignes: missionsDues.slice(0, lignesMax).map(({ m, reste }) => ({
          id: m.id,
          libelle: `Mission ${m.referenceInterne ?? ''}`.trim(),
          tiers: nomPersonne(m.prospect),
          echeance: null,
          reste,
          lien: `/demarches/missions/${m.id}`,
        })),
      },
      commissionsAPayer: {
        total: nombre(commissionsAPayer._sum.montantValide),
        nombre: commissionsAPayer._count._all,
      },
      avenir30Jours: {
        ventes: reste30j(echeancesVentes),
        loyers: reste30j(echeancesLoyers),
      },
    };
  }

  // ------------------------------------------------------------------
  // Clôture mensuelle
  // ------------------------------------------------------------------

  async clotures() {
    const existantes = await this.prisma.clotureFinanciere.findMany({
      orderBy: { periode: 'desc' },
      include: {
        parUser: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    const parPeriode = new Map(existantes.map((c) => [c.periode, c]));
    const maintenant = new Date();
    const mois: Array<{
      periode: string;
      cloture: boolean;
      clotureLe: Date | null;
      par: { id: string; firstName: string; lastName: string } | null;
      resume: unknown;
      peutEtreCloture: boolean;
    }> = [];
    // Les 24 derniers mois, du plus récent au plus ancien.
    for (let i = 0; i < 24; i += 1) {
      const date = new Date(
        Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth() - i, 1),
      );
      const periode = moisDe(date);
      const cloture = parPeriode.get(periode);
      mois.push({
        periode,
        cloture: !!cloture,
        clotureLe: cloture?.clotureLe ?? null,
        par: cloture?.parUser ?? null,
        resume: cloture?.resume ?? null,
        // Un mois en cours n'est pas terminé : on ne le clôture pas.
        peutEtreCloture: i > 0 && !cloture,
      });
    }
    return mois;
  }

  async cloturer(periode: string, userId: string) {
    if (!periodeValide(periode)) {
      throw new BadRequestException('Période invalide : attendu AAAA-MM');
    }
    if (periode >= moisDe(new Date())) {
      throw new BadRequestException(
        'Le mois en cours n’est pas terminé : on ne peut clôturer qu’un mois passé',
      );
    }
    if (
      await this.prisma.clotureFinanciere.findUnique({ where: { periode } })
    ) {
      throw new ConflictException('Ce mois est déjà clôturé');
    }
    const { debut, fin } = bornesMois(periode);
    const enAttente = await this.prisma.operationFinanciere.count({
      where: { statut: 'en_attente', date: { gte: debut, lt: fin } },
    });
    if (enAttente > 0) {
      throw new ConflictException(
        `${enAttente} opération(s) de ce mois attendent encore leur validation : validez-les ou rejetez-les avant de clôturer`,
      );
    }
    const { lignes, margesInconnues } = await this.flux.collecter(debut, fin);
    const { global, parActivite } = totaliser(lignes);
    const cloture = await this.prisma.clotureFinanciere.create({
      data: {
        periode,
        cloturePar: userId,
        resume: {
          totaux: global,
          parActivite,
          mouvements: lignes.length,
          margesInconnues,
        } as unknown as Prisma.InputJsonObject,
      },
    });
    return cloture;
  }

  async rouvrir(periode: string): Promise<void> {
    const cloture = await this.prisma.clotureFinanciere.findUnique({
      where: { periode },
    });
    if (!cloture) throw new NotFoundException('Ce mois n’est pas clôturé');
    await this.prisma.clotureFinanciere.delete({ where: { periode } });
  }
}
