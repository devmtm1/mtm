import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  type LigneJournal,
  LIBELLES_ACTIVITE,
  LIBELLES_NATURE,
  celluleCsv,
  jourIso,
  nombre,
  nombreFrancais,
  totaliser,
} from './finances.calculs';
import { FinancesService } from './finances.service';
import { FluxFinanciersService } from './flux.service';
import { ChantiersFinanceService } from './chantiers-finance.service';
import { RapprochementService } from './rapprochement.service';
import { ReversementsService } from './reversements.service';
import { QueryPeriodeDto } from './dto/finances.dto';
import { QueryRapportDto } from './dto/tresorerie.dto';
import { TresorerieService } from './tresorerie.service';
import {
  LIBELLES_MODE_REVERSEMENT,
  type ModeReversement,
  jourUtc,
} from './tresorerie.calculs';

const UN_JOUR = 24 * 3600 * 1000;

/**
 * Actions du journal d'audit que la Direction doit voir : ce sont des
 * tentatives de contourner une règle, ou des gestes exceptionnels.
 */
export const ACTIONS_ANOMALIE = [
  'finances.suppression_refusee',
  'finances.mois_rouvert',
  'finances.ecart_caisse',
  'finances.autorisation_distance',
  'finances.avance_proprietaire_autorisee',
];

export interface Colonne {
  cle: string;
  libelle: string;
  type: 'texte' | 'montant' | 'date' | 'nombre';
}

export type Cellule = string | number | null;

export interface RapportTable {
  code: string;
  titre: string;
  description: string;
  colonnes: Colonne[];
  lignes: Array<Record<string, Cellule>>;
  /** Ligne de totaux, sur les colonnes numériques. */
  totaux: Record<string, Cellule> | null;
}

export const CATALOGUE_RAPPORTS = [
  {
    code: 'journal-caisse',
    titre: 'Journal de caisse',
    description: 'Chaque mouvement des caisses, avec le solde après mouvement.',
    parPeriode: true,
  },
  {
    code: 'journal-banques',
    titre: 'Journal des banques et portefeuilles mobiles',
    description:
      'Chaque mouvement des comptes bancaires, de Wave et d’Orange Money.',
    parPeriode: true,
  },
  {
    code: 'depenses-par-categorie',
    titre: 'Dépenses par catégorie',
    description: 'Ce que MTM a dépensé, regroupé par catégorie ou par nature.',
    parPeriode: true,
  },
  {
    code: 'recettes-par-activite',
    titre: 'Recettes par activité',
    description: 'Encaissements, revenu de MTM et dépenses de chaque activité.',
    parPeriode: true,
  },
  {
    code: 'ventes',
    titre: 'Ventes au comptant et à moratoire',
    description:
      'Chaque dossier de vente : prix, encaissé, reste à payer et retards.',
    parPeriode: false,
  },
  {
    code: 'creances',
    titre: 'Créances clients et impayés',
    description: 'Ce que les clients doivent à MTM, échéance par échéance.',
    parPeriode: false,
  },
  {
    code: 'commissions-mtm',
    titre: 'Commissions et revenus de MTM',
    description:
      'Le revenu de MTM sur la période, par activité et par origine (commission, marge, honoraires).',
    parPeriode: true,
  },
  {
    code: 'proprietaires',
    titre: 'Sommes dues et reversées aux propriétaires',
    description:
      'Pour chaque terrain confié : encaissé, commission de MTM, dû, reversé et solde.',
    parPeriode: false,
  },
  {
    code: 'rentabilite-chantiers',
    titre: 'Rentabilité de chaque chantier',
    description:
      'Prix, recettes confirmées, coût réel, marge réelle et coût final estimé.',
    parPeriode: false,
  },
  {
    code: 'sans-justificatif',
    titre: 'Opérations sans justificatif',
    description: 'Les mouvements de la période dont la pièce manque.',
    parPeriode: true,
  },
  {
    code: 'corrections-validations',
    titre: 'Corrections, validations et annulations',
    description:
      'Ce qui a été validé, refusé, corrigé ou tenté de contourner : le journal des gestes sensibles.',
    parPeriode: true,
  },
] as const;

const montant = (cle: string, libelle: string): Colonne => ({
  cle,
  libelle,
  type: 'montant',
});
const texte = (cle: string, libelle: string): Colonne => ({
  cle,
  libelle,
  type: 'texte',
});
const date = (cle: string, libelle: string): Colonne => ({
  cle,
  libelle,
  type: 'date',
});
const compte = (cle: string, libelle: string): Colonne => ({
  cle,
  libelle,
  type: 'nombre',
});

function sommer(
  lignes: Array<Record<string, Cellule>>,
  colonnes: Colonne[],
): Record<string, Cellule> | null {
  const numeriques = colonnes.filter(
    (c) => c.type === 'montant' || c.type === 'nombre',
  );
  if (numeriques.length === 0 || lignes.length === 0) return null;
  const totaux: Record<string, Cellule> = {};
  for (const c of numeriques) {
    totaux[c.cle] = lignes.reduce((t, l) => t + nombre(l[c.cle]), 0);
  }
  return totaux;
}

/** Cellule d'un rapport au format CSV : nombres à la française, dates ISO. */
function celluleRapport(valeur: Cellule, type: Colonne['type']): string {
  if (valeur === null || valeur === undefined) return '';
  if (type === 'montant' || type === 'nombre')
    return nombreFrancais(Number(valeur));
  return celluleCsv(String(valeur));
}

/** CSV d'un rapport : « ; », virgule décimale, BOM pour les accents dans Excel. */
export function rapportVersCsv(rapport: RapportTable): Buffer {
  const entete = rapport.colonnes.map((c) => celluleCsv(c.libelle)).join(';');
  const corps = rapport.lignes.map((ligne) =>
    rapport.colonnes
      .map((c) => celluleRapport(ligne[c.cle] ?? null, c.type))
      .join(';'),
  );
  const totaux = rapport.totaux
    ? [
        rapport.colonnes
          .map((c, index) =>
            index === 0
              ? 'Total'
              : celluleRapport(rapport.totaux?.[c.cle] ?? null, c.type),
          )
          .join(';'),
      ]
    : [];
  // Marque d'ordre des octets : sans elle, Excel lit les accents de travers.
  const bom = String.fromCharCode(0xfeff);
  const contenu = [entete, ...corps, ...totaux].join('\r\n');
  return Buffer.from(`${bom}${contenu}\r\n`, 'utf8');
}

const nomComplet = (
  p?: null | {
    firstName?: string | null;
    lastName?: string | null;
    prenom?: string | null;
    nom?: string | null;
  },
): string | null =>
  [p?.firstName ?? p?.prenom, p?.lastName ?? p?.nom]
    .filter(Boolean)
    .join(' ')
    .trim() || null;

/**
 * Pilotage de la Direction générale : tableau de bord consolidé (trésorerie,
 * créances, sommes dues aux propriétaires, chantiers, anomalies) et états à la
 * demande. Aucun indicateur n'est calculé à partir de données non confirmées :
 * tout vient des mouvements validés, ou des files d'attente nommées comme telles.
 */
@Injectable()
export class ControleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly finances: FinancesService,
    private readonly flux: FluxFinanciersService,
    private readonly tresorerie: TresorerieService,
    private readonly reversements: ReversementsService,
    private readonly chantiers: ChantiersFinanceService,
    private readonly rapprochement: RapprochementService,
  ) {}

  // ------------------------------------------------------------------
  // Tableau de bord de la Direction générale
  // ------------------------------------------------------------------

  async direction(query: QueryPeriodeDto) {
    const [tableau, soldes, proprietaires, chantiers, joursNonClotures] =
      await Promise.all([
        this.finances.tableau(query),
        this.tresorerie.soldes(),
        this.reversements.situations(),
        this.chantiers.rentabilite(),
        this.tresorerie.joursNonClotures(),
      ]);
    const il_y_a_30_jours = new Date(Date.now() - 30 * UN_JOUR);

    const [
      reversementsEnAttente,
      reversementsAPayer,
      sansJustificatif,
      aAutoriser,
      mouvementsEnAttente,
      ecarts,
      remboursements,
      anomalies,
      anomaliesTotal,
      paiementsChantierEnAttente,
      rapprochement,
    ] = await Promise.all([
      this.prisma.reversementProprietaire.aggregate({
        where: { statut: 'en_attente' },
        _count: { _all: true },
        _sum: { montant: true },
      }),
      this.prisma.reversementProprietaire.aggregate({
        where: { statut: 'autorise' },
        _count: { _all: true },
        _sum: { montant: true },
      }),
      this.prisma.operationFinanciere.aggregate({
        where: {
          sens: 'depense',
          justificatifKey: null,
          statut: { in: ['en_attente', 'validee'] },
        },
        _count: { _all: true },
        _sum: { montant: true },
      }),
      this.prisma.operationFinanciere.count({
        where: {
          statut: 'en_attente',
          niveauValidation: { gte: 1 },
          autoriseParId: null,
        },
      }),
      this.prisma.mouvementFonds.count({ where: { statut: 'en_attente' } }),
      this.prisma.clotureCaisse.findMany({
        where: { decision: { in: ['en_attente', 'a_corriger'] } },
        include: {
          compte: { select: { nom: true } },
          parUser: { select: { firstName: true, lastName: true } },
        },
        orderBy: { date: 'desc' },
        take: 10,
      }),
      this.prisma.demandeRemboursement.findMany({
        where: { statut: { in: ['demandee', 'acceptee'] } },
        select: { dateLimite: true, montantRembourse: true, statut: true },
      }),
      this.prisma.auditLog.findMany({
        where: {
          action: { in: ACTIONS_ANOMALIE },
          createdAt: { gte: il_y_a_30_jours },
        },
        include: { user: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      this.prisma.auditLog.count({
        where: {
          action: { in: ACTIONS_ANOMALIE },
          createdAt: { gte: il_y_a_30_jours },
        },
      }),
      this.prisma.paiementChantier.count({ where: { statut: 'en_attente' } }),
      this.rapprochement.resume(),
    ]);

    const rapportDuJour = await this.prisma.rapportQuotidien.findUnique({
      where: { date: jourUtc(new Date()) },
      select: { statut: true },
    });

    return {
      ...tableau,
      tresorerie: soldes,
      proprietaires: {
        ...proprietaires.totaux,
        parProprietaire: proprietaires.parProprietaire.slice(0, 8),
      },
      reversements: {
        enAttente: {
          nombre: reversementsEnAttente._count._all,
          montant: nombre(reversementsEnAttente._sum.montant),
        },
        aPayer: {
          nombre: reversementsAPayer._count._all,
          montant: nombre(reversementsAPayer._sum.montant),
        },
      },
      chantiers: {
        nombre: chantiers.length,
        recettes: chantiers.reduce((t, c) => t + c.recettesConfirmees, 0),
        cout: chantiers.reduce((t, c) => t + c.coutReel, 0),
        marge: chantiers.reduce((t, c) => t + c.margeReelle, 0),
        enDepassement: chantiers.filter((c) => c.depassementBudget).length,
        liste: [...chantiers]
          .sort((a, b) => a.margeReelle - b.margeReelle)
          .slice(0, 8),
      },
      depensesSansJustificatif: {
        nombre: sansJustificatif._count._all,
        montant: nombre(sansJustificatif._sum.montant),
      },
      aAutoriser,
      mouvementsEnAttente,
      paiementsChantierEnAttente,
      ecartsCaisse: {
        nombre: ecarts.length,
        montant: ecarts.reduce((t, e) => t + Math.abs(nombre(e.ecart)), 0),
        liste: ecarts.map((e) => ({
          id: e.id,
          date: e.date,
          compte: e.compte.nom,
          ecart: nombre(e.ecart),
          decision: e.decision,
          par: nomComplet(e.parUser),
        })),
      },
      joursNonClotures,
      rapprochement,
      remboursements: {
        enCours: remboursements.length,
        enRetard: remboursements.filter(
          (r) => r.dateLimite.getTime() < Date.now(),
        ).length,
        montant: remboursements.reduce(
          (t, r) => t + nombre(r.montantRembourse),
          0,
        ),
      },
      anomaliesAudit: {
        nombre: anomaliesTotal,
        liste: anomalies.map((a) => ({
          id: a.id,
          action: a.action,
          date: a.createdAt,
          par: nomComplet(a.user),
          justification: a.justification,
        })),
      },
      rapportDuJour: rapportDuJour?.statut ?? null,
    };
  }

  // ------------------------------------------------------------------
  // États à la demande
  // ------------------------------------------------------------------

  /** Période d'un état : par défaut le mois en cours ; au plus 366 jours. */
  private bornes(query: QueryRapportDto): { du: Date; au: Date } {
    const maintenant = new Date();
    const du = query.du
      ? new Date(`${query.du.slice(0, 10)}T00:00:00.000Z`)
      : new Date(
          Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), 1),
        );
    const dernier = query.au
      ? new Date(`${query.au.slice(0, 10)}T00:00:00.000Z`)
      : jourUtc(maintenant);
    const au = new Date(dernier.getTime() + UN_JOUR);
    if (!(au > du)) {
      throw new BadRequestException('La fin de la période précède son début');
    }
    if ((au.getTime() - du.getTime()) / UN_JOUR > 366) {
      throw new BadRequestException(
        'La période ne peut pas dépasser 366 jours',
      );
    }
    return { du, au };
  }

  async rapport(code: string, query: QueryRapportDto): Promise<RapportTable> {
    const entree = CATALOGUE_RAPPORTS.find((r) => r.code === code);
    if (!entree) throw new NotFoundException('État inconnu');
    const { du, au } = this.bornes(query);
    const construire = async (): Promise<{
      colonnes: Colonne[];
      lignes: Array<Record<string, Cellule>>;
    }> => {
      switch (code) {
        case 'journal-caisse':
          return this.journalTresorerie(['caisse'], du, au, query.compteId);
        case 'journal-banques':
          return this.journalTresorerie(
            ['banque', 'wave', 'orange_money', 'autre'],
            du,
            au,
            query.compteId,
          );
        case 'depenses-par-categorie':
          return this.depensesParCategorie(du, au);
        case 'recettes-par-activite':
          return this.recettesParActivite(du, au);
        case 'ventes':
          return this.ventes();
        case 'creances':
          return this.creances();
        case 'commissions-mtm':
          return this.revenusParOrigine(du, au);
        case 'proprietaires':
          return this.proprietaires();
        case 'rentabilite-chantiers':
          return this.rentabiliteChantiers();
        case 'sans-justificatif':
          return this.sansJustificatif(du, au);
        default:
          return this.correctionsValidations(du, au);
      }
    };
    const { colonnes, lignes } = await construire();
    return {
      code: entree.code,
      titre: entree.titre,
      description: entree.description,
      colonnes,
      lignes,
      totaux: sommer(lignes, colonnes),
    };
  }

  private async journalTresorerie(
    types: string[],
    du: Date,
    au: Date,
    compteId?: string,
  ) {
    const comptes = await this.prisma.compteTresorerie.findMany({
      where: {
        type: { in: types },
        actif: true,
        ...(compteId ? { id: compteId } : {}),
      },
      orderBy: { nom: 'asc' },
    });
    const colonnes: Colonne[] = [
      date('date', 'Date'),
      texte('compte', 'Compte'),
      texte('numero', 'N° opération'),
      texte('libelle', 'Libellé'),
      texte('tiers', 'Tiers'),
      texte('reference', 'Référence'),
      montant('entree', 'Entrée'),
      montant('sortie', 'Sortie'),
      montant('solde', 'Solde après'),
    ];
    if (comptes.length === 0) return { colonnes, lignes: [] };

    const debut = new Date(
      Math.min(...comptes.map((c) => c.dateSoldeInitial.getTime())),
    );
    const pris = new Map(comptes.map((c) => [c.id, c]));
    const evenements = await this.tresorerie.evenementsComptes(
      comptes.map((c) => c.id),
      debut,
      au,
    );

    const soldes = new Map(comptes.map((c) => [c.id, nombre(c.soldeInitial)]));
    const lignes: Array<Record<string, Cellule>> = [];
    for (const e of evenements) {
      const c = pris.get(e.compteId);
      if (!c || e.date < c.dateSoldeInitial) continue;
      const solde = (soldes.get(e.compteId) ?? 0) + e.entree - e.sortie;
      soldes.set(e.compteId, solde);
      if (e.date >= du && e.date < au) {
        lignes.push({
          date: jourIso(e.date),
          compte: c.nom,
          numero: e.numero,
          libelle: e.libelle,
          tiers: e.tiers,
          reference: e.reference,
          entree: e.entree,
          sortie: e.sortie,
          solde,
        });
      }
    }
    return { colonnes, lignes };
  }

  private async depensesParCategorie(du: Date, au: Date) {
    const { lignes } = await this.flux.collecter(du, au);
    const groupes = new Map<string, { nombre: number; montant: number }>();
    const operations = await this.prisma.operationFinanciere.findMany({
      where: {
        statut: 'validee',
        sens: 'depense',
        nature: 'definitive',
        date: { gte: du, lt: au },
      },
      select: { categorie: true, montant: true },
    });
    const ajouter = (cle: string, valeur: number) => {
      const courant = groupes.get(cle) ?? { nombre: 0, montant: 0 };
      groupes.set(cle, {
        nombre: courant.nombre + 1,
        montant: courant.montant + valeur,
      });
    };
    for (const o of operations) ajouter(o.categorie, nombre(o.montant));
    for (const l of lignes) {
      if (
        l.sens === 'sortie' &&
        !l.horsResultat &&
        l.nature !== 'operation_depense'
      ) {
        ajouter(LIBELLES_NATURE[l.nature], l.montant);
      }
    }
    const total = [...groupes.values()].reduce((t, g) => t + g.montant, 0);
    const colonnes: Colonne[] = [
      texte('categorie', 'Catégorie ou nature'),
      compte('nombre', 'Opérations'),
      montant('montant', 'Montant'),
      compte('part', 'Part (%)'),
    ];
    const rows = [...groupes.entries()]
      .map(([categorie, g]) => ({
        categorie: categorie.replace(/_/g, ' '),
        nombre: g.nombre,
        montant: g.montant,
        part: total > 0 ? Math.round((g.montant / total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.montant - a.montant);
    return { colonnes, lignes: rows };
  }

  private async recettesParActivite(du: Date, au: Date) {
    const { lignes } = await this.flux.collecter(du, au);
    const { parActivite } = totaliser(lignes);
    const colonnes: Colonne[] = [
      texte('activite', 'Activité'),
      montant('encaissements', 'Encaissements'),
      montant('revenu', 'Revenu de MTM'),
      montant('depenses', 'Dépenses'),
      montant('resultat', 'Résultat'),
    ];
    const rows = (Object.keys(parActivite) as Array<keyof typeof parActivite>)
      .map((activite) => ({
        activite: LIBELLES_ACTIVITE[activite],
        ...parActivite[activite],
      }))
      .filter((r) => r.encaissements || r.revenu || r.depenses);
    return { colonnes, lignes: rows };
  }

  private async ventes() {
    const dossiers = await this.prisma.dossierVente.findMany({
      where: { statut: { not: 'annule' }, prixVente: { gt: 0 } },
      select: {
        id: true,
        referenceInterne: true,
        prixVente: true,
        statut: true,
        prospect: { select: { nom: true, prenom: true } },
        terrain: { select: { nom: true } },
        paiements: { where: { statut: 'valide' }, select: { montant: true } },
        echeances: { select: { statut: true, dateEcheance: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    const maintenant = Date.now();
    const colonnes: Colonne[] = [
      texte('reference', 'Dossier'),
      texte('client', 'Client'),
      texte('terrain', 'Bien'),
      texte('type', 'Type'),
      montant('prix', 'Prix de vente'),
      montant('encaisse', 'Encaissé'),
      montant('reste', 'Reste à payer'),
      compte('retards', 'Échéances en retard'),
    ];
    const lignes = dossiers.map((d) => {
      const prix = nombre(d.prixVente);
      const encaisse = d.paiements.reduce((t, p) => t + nombre(p.montant), 0);
      return {
        reference: d.referenceInterne,
        client: nomComplet(d.prospect),
        terrain: d.terrain?.nom ?? null,
        type: d.echeances.length > 1 ? 'Moratoire' : 'Comptant',
        prix,
        encaisse,
        reste: Math.max(0, prix - encaisse),
        retards: d.echeances.filter(
          (e) =>
            e.dateEcheance.getTime() < maintenant &&
            ['en_attente', 'partielle'].includes(e.statut),
        ).length,
      };
    });
    return { colonnes, lignes };
  }

  private async creances() {
    const a = await this.finances.aEncaisser(new Date(), 200);
    const colonnes: Colonne[] = [
      texte('type', 'Origine'),
      texte('libelle', 'Libellé'),
      texte('tiers', 'Client'),
      date('echeance', 'Échéance'),
      montant('reste', 'Reste dû'),
    ];
    const rows = (
      [
        ['Loyer', a.loyers.lignes],
        ['Vente', a.ventes.lignes],
        ['Démarche', a.missions.lignes],
      ] as const
    ).flatMap(([type, liste]) =>
      liste.map((l) => ({
        type,
        libelle: l.libelle,
        tiers: l.tiers,
        echeance: l.echeance ? jourIso(new Date(l.echeance)) : null,
        reste: l.reste,
      })),
    );
    return { colonnes, lignes: rows };
  }

  private async revenusParOrigine(du: Date, au: Date) {
    const { lignes } = await this.flux.collecter(du, au);
    const groupes = new Map<
      string,
      { activite: string; origine: string; encaisse: number; revenu: number }
    >();
    for (const l of lignes) {
      if (l.sens !== 'entree' || l.horsResultat) continue;
      const cle = `${l.activite}:${l.nature}`;
      const courant = groupes.get(cle) ?? {
        activite: LIBELLES_ACTIVITE[l.activite],
        origine: LIBELLES_NATURE[l.nature],
        encaisse: 0,
        revenu: 0,
      };
      courant.encaisse += l.montant;
      courant.revenu += l.revenu;
      groupes.set(cle, courant);
    }
    const colonnes: Colonne[] = [
      texte('activite', 'Activité'),
      texte('origine', 'Origine'),
      montant('encaisse', 'Encaissé'),
      montant('revenu', 'Revenu de MTM'),
    ];
    return {
      colonnes,
      lignes: [...groupes.values()].sort((a, b) => b.revenu - a.revenu),
    };
  }

  private async proprietaires() {
    const { dossiers } = await this.reversements.situations();
    const colonnes: Colonne[] = [
      texte('proprietaire', 'Propriétaire'),
      texte('dossier', 'Dossier'),
      texte('bien', 'Bien'),
      texte('mode', 'Mode de reversement'),
      montant('prix', 'Prix de vente'),
      montant('commission', 'Commission de MTM'),
      montant('encaisse', 'Encaissé'),
      montant('du', 'Dû au propriétaire'),
      montant('reverse', 'Déjà reversé'),
      montant('enCours', 'En cours'),
      montant('solde', 'Solde restant'),
    ];
    return {
      colonnes,
      lignes: dossiers.map((d) => ({
        proprietaire: d.proprietaire.nom,
        dossier: d.reference,
        bien: d.terrain?.nom ?? null,
        mode: LIBELLES_MODE_REVERSEMENT[d.mode as ModeReversement] ?? d.mode,
        prix: d.prixVente,
        commission: d.commission,
        encaisse: d.encaisse,
        du: d.du,
        reverse: d.reverse,
        enCours: d.enCours,
        solde: d.soldeRestant,
      })),
    };
  }

  private async rentabiliteChantiers() {
    const chantiers = await this.chantiers.rentabilite();
    const colonnes: Colonne[] = [
      texte('reference', 'Chantier'),
      texte('client', 'Client'),
      compte('avancement', 'Avancement (%)'),
      montant('prix', 'Prix'),
      montant('budget', 'Budget prévu'),
      montant('recettes', 'Recettes confirmées'),
      montant('cout', 'Coût réel'),
      montant('achatsClient', 'Achats du client'),
      montant('margeReelle', 'Marge réelle'),
      montant('coutFinal', 'Coût final estimé'),
      montant('resultat', 'Résultat estimé'),
    ];
    return {
      colonnes,
      lignes: chantiers.map((c) => ({
        reference: `${c.referenceInterne} — ${c.intitule}`,
        client: c.client,
        avancement: c.avancement,
        prix: c.prixTotal,
        budget: c.budgetPrevu,
        recettes: c.recettesConfirmees,
        cout: c.coutReel,
        achatsClient: c.achatsClient,
        margeReelle: c.margeReelle,
        coutFinal: c.coutFinalEstime,
        resultat: c.resultatEstime,
      })),
    };
  }

  private async sansJustificatif(du: Date, au: Date) {
    const { lignes } = await this.flux.collecter(du, au);
    const colonnes: Colonne[] = [
      date('date', 'Date'),
      texte('numero', 'N° opération'),
      texte('nature', 'Nature'),
      texte('libelle', 'Libellé'),
      texte('tiers', 'Tiers'),
      montant('montant', 'Montant'),
    ];
    return {
      colonnes,
      lignes: lignes
        .filter((l: LigneJournal) => l.justifie === false)
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .map((l) => ({
          date: jourIso(l.date),
          numero: l.numero ?? null,
          nature: LIBELLES_NATURE[l.nature],
          libelle: l.libelle,
          tiers: l.tiers,
          montant: l.montant,
        })),
    };
  }

  private async correctionsValidations(du: Date, au: Date) {
    const journaux = await this.prisma.auditLog.findMany({
      where: {
        action: { startsWith: 'finances.' },
        createdAt: { gte: du, lt: au },
      },
      include: { user: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });
    const colonnes: Colonne[] = [
      texte('date', 'Date et heure'),
      texte('action', 'Geste'),
      texte('par', 'Par'),
      texte('objet', 'Objet'),
      texte('motif', 'Motif'),
    ];
    return {
      colonnes,
      lignes: journaux.map((j) => ({
        date: j.createdAt.toISOString().slice(0, 16).replace('T', ' '),
        action: LIBELLES_AUDIT[j.action] ?? j.action,
        par: nomComplet(j.user),
        objet: j.entityId
          ? `${j.entityType} ${j.entityId.slice(0, 8)}`
          : j.entityType,
        motif: j.justification ?? null,
      })),
    };
  }
}

export const LIBELLES_AUDIT: Record<string, string> = {
  'finances.operation_saisie': 'Saisie d’une opération',
  'finances.operation_validee': 'Validation d’une opération',
  'finances.operation_rejetee': 'Rejet d’une opération',
  'finances.operation_supprimee': 'Suppression d’une opération non validée',
  'finances.operation_autorisee': 'Autorisation de la Direction',
  'finances.autorisation_distance': 'Autorisation à distance',
  'finances.correction': 'Correction d’une écriture validée',
  'finances.suppression_refusee': 'Tentative de suppression refusée',
  'finances.mois_cloture': 'Clôture d’un mois',
  'finances.mois_rouvert': 'Réouverture d’un mois',
  'finances.export': 'Export comptable',
  'finances.cloture_caisse': 'Clôture de caisse',
  'finances.ecart_caisse': 'Écart de caisse déclaré',
  'finances.ecart_caisse_decide': 'Décision sur un écart de caisse',
  'finances.mouvement_fonds': 'Mouvement de fonds saisi',
  'finances.mouvement_fonds_confirme': 'Mouvement de fonds confirmé',
  'finances.reversement_demande': 'Reversement demandé',
  'finances.reversement_autorise': 'Reversement autorisé',
  'finances.reversement_paye': 'Reversement payé',
  'finances.reversement_rejete': 'Reversement rejeté',
  'finances.avance_proprietaire_autorisee': 'Avance au propriétaire autorisée',
  'finances.remboursement_demande': 'Désistement : remboursement demandé',
  'finances.remboursement_decide': 'Désistement : décision',
  'finances.remboursement_paye': 'Remboursement payé',
  'finances.paiement_chantier_valide': 'Paiement de chantier validé',
  'finances.paiement_chantier_rejete': 'Paiement de chantier rejeté',
  'finances.rapport_transmis': 'Rapport quotidien transmis',
  'finances.releve_importe': 'Relevé bancaire importé',
  'finances.rapprochement': 'Ligne de relevé rapprochée',
  'finances.rapprochement_automatique': 'Rapprochement automatique',
  'finances.rapprochement_ignore': 'Ligne de relevé ignorée',
  'finances.rapprochement_annule': 'Rapprochement annulé',
};
