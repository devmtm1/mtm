import type { PrismaTransaction } from '../../database/prisma.service';

/** Nombre d'échéances générées à la création d'un bail. */
export const LOT_ECHEANCES = 12;

/**
 * Marge d'échéances maintenue devant la date du jour par la tâche
 * quotidienne : un bail qui dure ne doit jamais se retrouver sans mois à
 * payer (le lot initial de douze mois s'épuise au bout d'un an).
 */
export const HORIZON_MOIS_DEFAUT = 3;

/** Statuts d'échéance sur lesquels un versement ne s'impute plus. */
export const ECHEANCE_STATUTS_FIGES = ['payee', 'annulee'] as const;

/**
 * Statut d'une échéance, recalculé à partir des faits plutôt que saisi à la
 * main (section 15 : « le solde doit être recalculé automatiquement »).
 * Utilisé aussi bien juste après un paiement qu'à la lecture et par la tâche
 * quotidienne, pour que « en retard »/« impayée » restent justes.
 */
export function deriveEcheanceStatut(
  montantPrevu: number,
  montantPaye: number,
  dateEcheance: Date,
  maintenant: Date = new Date(),
): string {
  if (montantPaye >= montantPrevu) return 'payee';
  const enRetard = dateEcheance.getTime() < maintenant.getTime();
  if (montantPaye > 0) return enRetard ? 'en_retard' : 'partielle';
  return enRetard ? 'impayee' : 'a_venir';
}

/** Premier jour du mois contenant `date`. */
function debutDuMois(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/** Nombre de mois entiers séparant deux débuts de mois. */
function moisEcoules(depuis: Date, jusqua: Date): number {
  return (
    (jusqua.getUTCFullYear() - depuis.getUTCFullYear()) * 12 +
    (jusqua.getUTCMonth() - depuis.getUTCMonth())
  );
}

export interface ParametresEcheances {
  bailLocatifId: string;
  loyerMensuel: number;
  jourEcheance: number;
  dateDebut: Date;
  dateFin: Date | null;
}

/**
 * Génère les échéances d'un bail, à partir de sa date de début (ou de la
 * dernière échéance déjà connue), pour `nombreMois` mois — bornées par la
 * date de fin du bail si elle est fixée à l'avance.
 *
 * L'échéance du premier mois ne peut pas tomber avant l'entrée dans les
 * lieux : un bail signé le 20 avec un loyer dû le 5 serait sinon créé déjà
 * impayé, pour un mois que le locataire n'a pas encore occupé.
 */
export async function genererEcheances(
  transaction: PrismaTransaction,
  params: ParametresEcheances,
  nombreMois: number,
): Promise<number> {
  if (nombreMois <= 0) return 0;
  const derniere = await transaction.echeanceLoyer.findFirst({
    where: { bailLocatifId: params.bailLocatifId },
    orderBy: { periode: 'desc' },
    select: { periode: true },
  });
  const premierMois = derniere
    ? new Date(
        Date.UTC(
          derniere.periode.getUTCFullYear(),
          derniere.periode.getUTCMonth() + 1,
          1,
        ),
      )
    : debutDuMois(params.dateDebut);

  const donnees: {
    bailLocatifId: string;
    periode: Date;
    dateEcheance: Date;
    montantPrevu: number;
  }[] = [];
  for (let index = 0; index < nombreMois; index += 1) {
    const periode = new Date(
      Date.UTC(
        premierMois.getUTCFullYear(),
        premierMois.getUTCMonth() + index,
        1,
      ),
    );
    if (params.dateFin && periode.getTime() > params.dateFin.getTime()) break;
    const joursDansLeMois = new Date(
      Date.UTC(periode.getUTCFullYear(), periode.getUTCMonth() + 1, 0),
    ).getUTCDate();
    let dateEcheance = new Date(
      Date.UTC(
        periode.getUTCFullYear(),
        periode.getUTCMonth(),
        Math.min(params.jourEcheance, joursDansLeMois),
      ),
    );
    if (dateEcheance.getTime() < params.dateDebut.getTime()) {
      dateEcheance = params.dateDebut;
    }
    donnees.push({
      bailLocatifId: params.bailLocatifId,
      periode,
      dateEcheance,
      montantPrevu: params.loyerMensuel,
    });
  }
  if (donnees.length === 0) return 0;
  const resultat = await transaction.echeanceLoyer.createMany({
    data: donnees,
    skipDuplicates: true,
  });
  return resultat.count;
}

/**
 * Complète les échéances d'un bail pour couvrir `horizonMois` mois devant la
 * date du jour. Appelée par la tâche quotidienne et avant d'imputer une
 * avance : sans elle, un bail de plus d'un an cesse d'être facturé.
 */
export async function completerEcheances(
  transaction: PrismaTransaction,
  params: ParametresEcheances,
  horizonMois: number = HORIZON_MOIS_DEFAUT,
  maintenant: Date = new Date(),
): Promise<number> {
  const derniere = await transaction.echeanceLoyer.findFirst({
    where: { bailLocatifId: params.bailLocatifId },
    orderBy: { periode: 'desc' },
    select: { periode: true },
  });
  const cible = new Date(
    Date.UTC(
      maintenant.getUTCFullYear(),
      maintenant.getUTCMonth() + horizonMois,
      1,
    ),
  );
  const depuis = derniere
    ? new Date(
        Date.UTC(
          derniere.periode.getUTCFullYear(),
          derniere.periode.getUTCMonth() + 1,
          1,
        ),
      )
    : debutDuMois(params.dateDebut);
  const manquants = moisEcoules(depuis, cible) + 1;
  return genererEcheances(transaction, params, manquants);
}

/**
 * Recale « en retard »/« impayée » sur la date du jour. Sans ce passage, une
 * échéance créée « à venir » resterait affichée ainsi des mois après son
 * terme : les listes, les statistiques et les relances s'appuient dessus.
 */
export async function rafraichirStatutsEcheances(
  prisma: PrismaTransaction,
  bailLocatifIds: string[],
  maintenant: Date = new Date(),
): Promise<number> {
  if (bailLocatifIds.length === 0) return 0;
  const echeances = await prisma.echeanceLoyer.findMany({
    where: {
      bailLocatifId: { in: bailLocatifIds },
      statut: { notIn: [...ECHEANCE_STATUTS_FIGES] },
      dateEcheance: { lt: maintenant },
    },
  });
  const aChanger = echeances
    .map((echeance) => ({
      echeance,
      statut: deriveEcheanceStatut(
        Number(echeance.montantPrevu),
        Number(echeance.montantPaye),
        echeance.dateEcheance,
        maintenant,
      ),
    }))
    .filter(({ echeance, statut }) => statut !== echeance.statut);
  for (const { echeance, statut } of aChanger) {
    await prisma.echeanceLoyer.update({
      where: { id: echeance.id },
      data: { statut },
    });
  }
  return aChanger.length;
}

/**
 * Impute un versement sur les échéances impayées les plus anciennes, dans
 * l'ordre — même principe que pour les ventes (`applyPaymentToEcheances`).
 * Une « avance » qui couvre plusieurs mois se répartit ainsi naturellement.
 *
 * Renvoie ce qui n'a pu être imputé : l'appelant décide s'il refuse le
 * versement ou le conserve en trop-perçu, jamais l'oubli silencieux.
 */
export async function imputerPaiementSurEcheances(
  transaction: PrismaTransaction,
  bailLocatifId: string,
  montant: number,
): Promise<number> {
  let montantRestant = montant;
  const echeances = await transaction.echeanceLoyer.findMany({
    where: { bailLocatifId, statut: { notIn: [...ECHEANCE_STATUTS_FIGES] } },
    orderBy: { periode: 'asc' },
  });

  for (const echeance of echeances) {
    if (montantRestant <= 0) break;
    const restantEcheance =
      Number(echeance.montantPrevu) - Number(echeance.montantPaye);
    if (restantEcheance <= 0) continue;
    const montantAffecte = Math.min(restantEcheance, montantRestant);
    const montantPaye = Number(echeance.montantPaye) + montantAffecte;
    await transaction.echeanceLoyer.update({
      where: { id: echeance.id },
      data: {
        montantPaye,
        statut: deriveEcheanceStatut(
          Number(echeance.montantPrevu),
          montantPaye,
          echeance.dateEcheance,
        ),
      },
    });
    montantRestant -= montantAffecte;
  }
  return montantRestant;
}

/**
 * Retire d'une échéance ce qu'un versement annulé lui avait apporté, en
 * repartant des plus récentes : le solde reste juste après un rejet.
 */
export async function desimputerPaiementSurEcheances(
  transaction: PrismaTransaction,
  bailLocatifId: string,
  montant: number,
): Promise<void> {
  let montantRestant = montant;
  const echeances = await transaction.echeanceLoyer.findMany({
    where: { bailLocatifId, montantPaye: { gt: 0 } },
    orderBy: { periode: 'desc' },
  });
  for (const echeance of echeances) {
    if (montantRestant <= 0) break;
    const retire = Math.min(Number(echeance.montantPaye), montantRestant);
    const montantPaye = Number(echeance.montantPaye) - retire;
    await transaction.echeanceLoyer.update({
      where: { id: echeance.id },
      data: {
        montantPaye,
        statut:
          echeance.statut === 'annulee'
            ? 'annulee'
            : deriveEcheanceStatut(
                Number(echeance.montantPrevu),
                montantPaye,
                echeance.dateEcheance,
              ),
      },
    });
    montantRestant -= retire;
  }
}
