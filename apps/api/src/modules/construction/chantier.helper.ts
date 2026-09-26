import type { PrismaTransaction } from '../../database/prisma.service';

/**
 * Calculs d'un chantier : avancement, consommation du budget et alertes
 * (section 16 : « planning avec jalons », « alertes sur retards, dépassements
 * budgétaires et échéances »).
 *
 * Regroupés ici pour que la liste des chantiers, la fiche, l'espace client, le
 * rapport d'avancement et la tâche quotidienne affichent tous les mêmes
 * chiffres — c'est le même principe que les calculs de bail en J2.1.
 *
 * Seules les dépenses validées pèsent sur le budget consommé : une dépense
 * saisie sur le chantier attend le contrôle comptable avant de compter
 * (section 24, permission « payer »).
 */

const JOUR_MS = 24 * 3600 * 1000;

/** Avancement du chantier, déduit de ses jalons. */
export interface AvancementChantier {
  /** Moyenne des jalons pondérée par leur poids, en pourcentage. */
  pourcentage: number;
  jalonsTotal: number;
  jalonsTermines: number;
  jalonsEnCours: number;
  jalonsBloques: number;
  /** Jalons dont la fin prévue est passée sans être terminés. */
  jalonsEnRetard: number;
  /** Retard du jalon le plus en retard, en jours. */
  joursRetardMax: number;
}

/** Consommation du budget d'un chantier. */
export interface BudgetChantier {
  /** Ce que le client a signé. */
  montantDevis: number;
  /** Ce que MTM prévoit de dépenser : budget saisi, ou somme des postes. */
  budgetPrevu: number;
  /** Somme des postes du budget prévisionnel. */
  totalLignes: number;
  /** Contrats signés avec les prestataires. */
  montantEngage: number;
  /** Dépenses validées. */
  montantDepense: number;
  /** Dépenses saisies en attente de contrôle comptable. */
  montantEnAttente: number;
  /** Positif : il reste du budget ; négatif : il est dépassé. */
  resteAEngager: number;
  /** Part du budget déjà dépensée, en pourcentage. */
  tauxConsommation: number;
  /** Écart entre le devis signé et la dépense réelle. */
  margeEstimee: number;
  depassement: boolean;
}

/** Ce qui doit remonter à l'écran sans attendre qu'on ouvre le chantier. */
export interface AlertesChantier {
  /** aucune | retard | depassement_budget | retard_et_depassement */
  situation: string;
  retard: boolean;
  depassementBudget: boolean;
  /** Retard du chantier entier sur sa date de fin prévue, en jours. */
  joursRetardProjet: number;
  jalonsEnRetard: number;
  /** Jalons dont la fin prévue tombe dans les prochains jours. */
  echeancesProches: number;
  /** Entrées de journal signalant un problème non résolu. */
  problemesOuverts: number;
}

/**
 * Seuil au-delà duquel on considère le budget dépassé. Le cahier des charges
 * demande une alerte « sur dépassement budgétaire » sans fixer de marge :
 * cette valeur est un défaut, surchargeable dans les Paramètres
 * (construction.seuilAlerteBudget).
 */
export const SEUIL_DEPASSEMENT_DEFAUT = 100;

/**
 * Horizon des échéances « proches » signalées sur la fiche, en jours. Défaut
 * surchargeable (construction.horizonEcheanceJours).
 */
export const HORIZON_ECHEANCE_DEFAUT = 14;

/** Statuts après lesquels un chantier ne bouge plus. */
export const STATUTS_CHANTIER_TERMINES = [
  'receptionne',
  'cloture',
  'abandonne',
] as const;

/** Statuts de jalon qui ne comptent pas dans l'avancement. */
const JALONS_HORS_CALCUL = ['annule'];

/**
 * Avancement pondéré des jalons.
 *
 * Un jalon terminé compte pour 100 % même si personne n'a saisi son
 * pourcentage : la date de fin réelle fait foi. Un chantier sans jalon garde
 * l'avancement qu'on lui a donné à la main plutôt que de retomber à zéro —
 * d'où le `null` retourné, que l'appelant distingue de « 0 % ».
 */
export function calculerAvancement(
  jalons: Array<{
    statut: string;
    poids: number;
    avancement: number;
    dateFinPrevue: Date | null;
    dateFinReelle: Date | null;
  }>,
  maintenant: Date = new Date(),
): Omit<AvancementChantier, 'pourcentage'> & { pourcentage: number | null } {
  const retenus = jalons.filter((j) => !JALONS_HORS_CALCUL.includes(j.statut));

  let poidsTotal = 0;
  let poidsFait = 0;
  let jalonsTermines = 0;
  let jalonsEnCours = 0;
  let jalonsBloques = 0;
  let jalonsEnRetard = 0;
  let joursRetardMax = 0;

  for (const jalon of retenus) {
    const poids = jalon.poids > 0 ? jalon.poids : 1;
    const part = jalon.statut === 'termine' ? 100 : borner(jalon.avancement);
    poidsTotal += poids;
    poidsFait += poids * part;

    if (jalon.statut === 'termine') jalonsTermines += 1;
    else if (jalon.statut === 'en_cours') jalonsEnCours += 1;
    else if (jalon.statut === 'bloque') jalonsBloques += 1;

    if (jalon.statut !== 'termine' && jalon.dateFinPrevue) {
      const retard = joursEcoules(jalon.dateFinPrevue, maintenant);
      if (retard > 0) {
        jalonsEnRetard += 1;
        if (retard > joursRetardMax) joursRetardMax = retard;
      }
    }
  }

  return {
    pourcentage: poidsTotal ? Math.round(poidsFait / poidsTotal) : null,
    jalonsTotal: retenus.length,
    jalonsTermines,
    jalonsEnCours,
    jalonsBloques,
    jalonsEnRetard,
    joursRetardMax,
  };
}

/**
 * Consommation du budget.
 *
 * Le budget de référence est celui saisi sur le projet ; à défaut, la somme
 * des postes prévisionnels. Sans l'un ni l'autre, aucun dépassement ne peut
 * être constaté — on ne dépasse pas un budget qui n'existe pas.
 */
export function calculerBudget(
  projet: { montantDevis: unknown; budgetPrevu: unknown },
  lignes: Array<{ montantPrevu: unknown }>,
  depenses: Array<{ montant: unknown; statut: string }>,
  intervenants: Array<{ montantContrat: unknown; statut: string }>,
  seuilPourcent: number = SEUIL_DEPASSEMENT_DEFAUT,
): BudgetChantier {
  const montantDevis = nombre(projet.montantDevis);
  const totalLignes = lignes.reduce((t, l) => t + nombre(l.montantPrevu), 0);
  const budgetSaisi = nombre(projet.budgetPrevu);
  const budgetPrevu = budgetSaisi > 0 ? budgetSaisi : totalLignes;

  let montantDepense = 0;
  let montantEnAttente = 0;
  for (const depense of depenses) {
    if (depense.statut === 'valide') montantDepense += nombre(depense.montant);
    else if (depense.statut === 'en_attente')
      montantEnAttente += nombre(depense.montant);
  }

  const montantEngage = intervenants
    .filter((i) => i.statut !== 'resilie' && i.statut !== 'pressenti')
    .reduce((t, i) => t + nombre(i.montantContrat), 0);

  const tauxConsommation = budgetPrevu
    ? Math.round((montantDepense / budgetPrevu) * 100)
    : 0;

  return {
    montantDevis,
    budgetPrevu,
    totalLignes,
    montantEngage,
    montantDepense,
    montantEnAttente,
    resteAEngager: budgetPrevu - montantDepense,
    tauxConsommation,
    margeEstimee: montantDevis - montantDepense,
    depassement: budgetPrevu > 0 && tauxConsommation > seuilPourcent,
  };
}

/**
 * Synthèse des alertes (section 16). Un chantier terminé, réceptionné ou
 * abandonné n'alerte plus : son retard est de l'histoire, pas une action à
 * mener.
 */
export function calculerAlertes(
  projet: { statut: string; dateFinPrevue: Date | null },
  // Seul le nombre de jalons en retard entre dans les alertes : le
  // pourcentage d'avancement, lui, peut encore valoir `null`.
  avancement: Pick<AvancementChantier, 'jalonsEnRetard'>,
  budget: BudgetChantier,
  problemesOuverts: number,
  echeancesProches: number,
  maintenant: Date = new Date(),
): AlertesChantier {
  const clos = (STATUTS_CHANTIER_TERMINES as readonly string[]).includes(
    projet.statut,
  );

  const joursRetardProjet =
    !clos && projet.dateFinPrevue
      ? Math.max(0, joursEcoules(projet.dateFinPrevue, maintenant))
      : 0;

  const retard =
    !clos && (joursRetardProjet > 0 || avancement.jalonsEnRetard > 0);
  const depassementBudget = !clos && budget.depassement;

  return {
    situation: situationAlerte(retard, depassementBudget),
    retard,
    depassementBudget,
    joursRetardProjet,
    jalonsEnRetard: clos ? 0 : avancement.jalonsEnRetard,
    echeancesProches: clos ? 0 : echeancesProches,
    problemesOuverts,
  };
}

/** Code unique stocké sur le projet, pour trier et filtrer la liste. */
export function situationAlerte(retard: boolean, depassement: boolean): string {
  if (retard && depassement) return 'retard_et_depassement';
  if (retard) return 'retard';
  if (depassement) return 'depassement_budget';
  return 'aucune';
}

/**
 * Recalcule et réécrit sur le projet ce que la liste doit pouvoir trier :
 * avancement, montants et situation d'alerte. Appelée après chaque mouvement
 * de jalon, de budget ou de dépense, et par la tâche quotidienne.
 *
 * Retourne la synthèse complète, pour éviter à l'appelant de relire ce qu'il
 * vient de faire écrire.
 */
export async function synchroniserChantier(
  prisma: PrismaTransaction,
  projetId: string,
  options: {
    seuilPourcent?: number;
    horizonJours?: number;
    maintenant?: Date;
  } = {},
): Promise<{
  avancement: AvancementChantier;
  budget: BudgetChantier;
  alertes: AlertesChantier;
}> {
  const maintenant = options.maintenant ?? new Date();
  const seuilPourcent = options.seuilPourcent ?? SEUIL_DEPASSEMENT_DEFAUT;
  const horizonJours = options.horizonJours ?? HORIZON_ECHEANCE_DEFAUT;

  const projet = await prisma.projetConstruction.findUnique({
    where: { id: projetId },
    select: {
      id: true,
      statut: true,
      montantDevis: true,
      budgetPrevu: true,
      dateFinPrevue: true,
      avancement: true,
    },
  });
  if (!projet) {
    throw new Error(`Chantier introuvable pour synchronisation : ${projetId}`);
  }

  const [jalons, lignes, depenses, intervenants, problemesOuverts] =
    await Promise.all([
      prisma.jalonChantier.findMany({
        where: { projetId },
        select: {
          statut: true,
          poids: true,
          avancement: true,
          dateFinPrevue: true,
          dateFinReelle: true,
        },
      }),
      prisma.ligneBudgetChantier.findMany({
        where: { projetId },
        select: { montantPrevu: true },
      }),
      prisma.depenseChantier.findMany({
        where: { projetId },
        select: { montant: true, statut: true },
      }),
      prisma.intervenantChantier.findMany({
        where: { projetId },
        select: { montantContrat: true, statut: true },
      }),
      prisma.entreeJournalChantier.count({
        where: { projetId, resolu: false },
      }),
    ]);

  const avancement = calculerAvancement(jalons, maintenant);
  const budget = calculerBudget(
    projet,
    lignes,
    depenses,
    intervenants,
    seuilPourcent,
  );

  const limite = new Date(maintenant.getTime() + horizonJours * JOUR_MS);
  const echeancesProches = jalons.filter(
    (jalon) =>
      jalon.statut !== 'termine' &&
      jalon.statut !== 'annule' &&
      jalon.dateFinPrevue !== null &&
      jalon.dateFinPrevue > maintenant &&
      jalon.dateFinPrevue <= limite,
  ).length;

  const alertes = calculerAlertes(
    projet,
    avancement,
    budget,
    problemesOuverts,
    echeancesProches,
    maintenant,
  );

  await prisma.projetConstruction.update({
    where: { id: projetId },
    data: {
      // Sans jalon, l'avancement saisi à la main est conservé.
      avancement: avancement.pourcentage ?? projet.avancement,
      montantEngage: budget.montantEngage,
      montantDepense: budget.montantDepense,
      situationAlerte: alertes.situation,
    },
  });

  return {
    avancement: { ...avancement, pourcentage: avancement.pourcentage ?? 0 },
    budget,
    alertes,
  };
}

/** Jours entiers écoulés depuis une date. Négatif si elle est à venir. */
function joursEcoules(depuis: Date, maintenant: Date): number {
  return Math.floor((maintenant.getTime() - depuis.getTime()) / JOUR_MS);
}

/** Un pourcentage saisi reste dans ses bornes, quoi qu'on ait tapé. */
function borner(valeur: number): number {
  if (!Number.isFinite(valeur)) return 0;
  return Math.min(100, Math.max(0, Math.round(valeur)));
}

/** Les montants arrivent en Decimal Prisma, en number ou en null. */
function nombre(valeur: unknown): number {
  if (valeur === null || valeur === undefined) return 0;
  const n = Number(valeur);
  return Number.isFinite(n) ? n : 0;
}
