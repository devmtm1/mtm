import type { PrismaTransaction } from '../../database/prisma.service';

/**
 * Calculs financiers d'un bail (section 15 : « le solde doit être recalculé
 * automatiquement », « calcul de régularisation », « loyers encaissés, solde »
 * de l'espace propriétaire). Regroupés ici pour que le back-office, les deux
 * espaces client et le relevé de gestion affichent tous les mêmes chiffres.
 *
 * Seuls les versements validés comptent : un encaissement en attente de
 * contrôle n'entre pas dans le solde (section 24).
 */

/** Photo financière d'un bail à un instant donné. */
export interface SoldeBail {
  loyersDus: number;
  loyersEncaisses: number;
  /** Positif : le locataire doit ; négatif : il est en avance. */
  solde: number;
  echeancesImpayees: number;
  /** Retard de la plus ancienne échéance encore due, en jours. */
  joursRetardMax: number;
  encaissementsEnAttente: number;
}

export interface EtatCaution {
  montantInitial: number;
  verse: number;
  retenu: number;
  rembourse: number;
  /** Ce qui reste détenu par MTM. */
  disponible: number;
  statut: string;
}

export interface Regularisation extends SoldeBail {
  /** Versé d'avance sur des mois postérieurs à la sortie : un crédit. */
  avanceReportee: number;
  caution: EtatCaution;
  /** Reste dû après prise en compte de l'avance, avant caution. */
  resteDu: number;
  retenueCautionProposee: number;
  cautionARembourserProposee: number;
  /** Positif : le locataire doit encore ; négatif : MTM lui doit. */
  montantPropose: number;
}

const JOUR_MS = 24 * 3600 * 1000;

/**
 * Recale la situation de paiement du bail (section 15 : le cas « impayé
 * prolongé » est porté par un statut, pas par une note libre). Appelée après
 * chaque imputation et par la tâche quotidienne.
 */
export async function synchroniserSituationPaiement(
  prisma: PrismaTransaction,
  bailLocatifId: string,
  impayeProlongeJours: number,
  maintenant: Date = new Date(),
): Promise<string> {
  const solde = await calculerSoldeBail(prisma, bailLocatifId, maintenant);
  const situation =
    solde.solde <= 0 || solde.joursRetardMax <= 0
      ? 'a_jour'
      : solde.joursRetardMax >= impayeProlongeJours
        ? 'impaye_prolonge'
        : 'retard';
  await prisma.bailLocatif.update({
    where: { id: bailLocatifId },
    data: { situationPaiement: situation },
  });
  return situation;
}

/** Solde d'un bail : ce qui est dû, ce qui a été validé, l'écart. */
export async function calculerSoldeBail(
  prisma: PrismaTransaction,
  bailLocatifId: string,
  maintenant: Date = new Date(),
): Promise<SoldeBail> {
  const [echeances, enAttente] = await Promise.all([
    prisma.echeanceLoyer.findMany({
      where: { bailLocatifId, statut: { not: 'annulee' } },
      select: {
        montantPrevu: true,
        montantPaye: true,
        dateEcheance: true,
        statut: true,
      },
    }),
    prisma.paiementLoyer.aggregate({
      where: { bailLocatifId, statut: 'en_attente' },
      _sum: { montant: true },
    }),
  ]);

  let loyersDus = 0;
  let loyersEncaisses = 0;
  let echeancesImpayees = 0;
  let joursRetardMax = 0;
  for (const echeance of echeances) {
    const prevu = Number(echeance.montantPrevu);
    const paye = Number(echeance.montantPaye);
    loyersDus += prevu;
    loyersEncaisses += paye;
    if (paye < prevu) {
      echeancesImpayees += 1;
      const retard = Math.floor(
        (maintenant.getTime() - echeance.dateEcheance.getTime()) / JOUR_MS,
      );
      if (retard > joursRetardMax) joursRetardMax = retard;
    }
  }

  return {
    loyersDus,
    loyersEncaisses,
    solde: loyersDus - loyersEncaisses,
    echeancesImpayees,
    joursRetardMax,
    encaissementsEnAttente: Number(enAttente._sum.montant ?? 0),
  };
}

/**
 * État de la caution reconstruit à partir de son historique (section 15 :
 * « montant initial, date, statut, retenues, justification, remboursement et
 * historique »). Le statut n'est jamais saisi : il découle des mouvements.
 */
export async function calculerEtatCaution(
  prisma: PrismaTransaction,
  bailLocatifId: string,
  montantInitial: number,
): Promise<EtatCaution> {
  const mouvements = await prisma.mouvementCaution.findMany({
    where: { bailLocatifId },
    select: { type: true, montant: true },
  });

  let verse = 0;
  let retenu = 0;
  let rembourse = 0;
  for (const mouvement of mouvements) {
    const montant = Number(mouvement.montant);
    if (mouvement.type === 'versement' || mouvement.type === 'ajustement') {
      verse += montant;
    } else if (mouvement.type === 'retenue') {
      retenu += montant;
    } else if (mouvement.type === 'remboursement') {
      rembourse += montant;
    }
  }

  return {
    montantInitial,
    verse,
    retenu,
    rembourse,
    disponible: verse - retenu - rembourse,
    statut: deriveCautionStatut(montantInitial, verse, retenu, rembourse),
  };
}

/** Statut de caution déduit des mouvements, jamais saisi à la main. */
export function deriveCautionStatut(
  montantInitial: number,
  verse: number,
  retenu: number,
  rembourse: number,
): string {
  if (verse <= 0) return 'non_versee';
  if (retenu > 0 && retenu >= verse) return 'retenue_totale';
  if (rembourse > 0 && retenu > 0) return 'partiellement_retenue';
  if (rembourse > 0 && rembourse + retenu >= verse) return 'remboursee';
  if (montantInitial > 0 && verse < montantInitial)
    return 'partiellement_versee';
  return 'versee';
}

/**
 * Calcul de régularisation de sortie (section 15). Propose des montants au
 * lieu de laisser l'opérateur les deviner : reste dû après imputation de
 * l'avance, retenue sur caution à hauteur de ce reste, solde de caution à
 * restituer. Rien n'est écrit : la clôture confirme ou corrige.
 */
export async function calculerRegularisation(
  prisma: PrismaTransaction,
  bail: {
    id: string;
    cautionMontant: unknown;
    dateSortieReelle: Date | null;
  },
  dateSortie: Date,
  maintenant: Date = new Date(),
): Promise<Regularisation> {
  const [solde, caution, avance] = await Promise.all([
    calculerSoldeBail(prisma, bail.id, maintenant),
    calculerEtatCaution(prisma, bail.id, Number(bail.cautionMontant ?? 0)),
    prisma.echeanceLoyer.aggregate({
      where: { bailLocatifId: bail.id, periode: { gt: dateSortie } },
      _sum: { montantPaye: true },
    }),
  ]);

  const avanceReportee = Number(avance._sum.montantPaye ?? 0);
  const resteDu = Math.max(0, solde.solde - avanceReportee);
  const retenueCautionProposee = Math.min(caution.disponible, resteDu);
  const cautionARembourserProposee =
    caution.disponible - retenueCautionProposee;
  const montantPropose = solde.solde - avanceReportee - retenueCautionProposee;

  return {
    ...solde,
    avanceReportee,
    caution,
    resteDu,
    retenueCautionProposee,
    cautionARembourserProposee,
    montantPropose,
  };
}
