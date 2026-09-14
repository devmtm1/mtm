import type { PrismaTransaction } from '../../database/prisma.service';

/**
 * Impute un montant encaissé sur les échéances d'un dossier, dans l'ordre :
 * chaque échéance est complétée avant de passer à la suivante. Partagé par
 * la validation d'un paiement et l'acompte de réservation, pour que
 * l'échéancier reflète tout ce qui a été réellement encaissé.
 */
export async function applyPaymentToEcheances(
  transaction: PrismaTransaction,
  dossierVenteId: string,
  montant: number,
): Promise<void> {
  let montantRestant = montant;
  const echeances = await transaction.echeancePaiement.findMany({
    where: { dossierVenteId },
    orderBy: { numero: 'asc' },
  });

  for (const echeance of echeances) {
    if (montantRestant <= 0) break;
    const restantEcheance =
      Number(echeance.montantPrevu) - Number(echeance.montantPaye);
    if (restantEcheance <= 0) continue;
    const montantAffecte = Math.min(restantEcheance, montantRestant);
    const montantPaye = Number(echeance.montantPaye) + montantAffecte;
    await transaction.echeancePaiement.update({
      where: { id: echeance.id },
      data: {
        montantPaye,
        statut:
          montantPaye >= Number(echeance.montantPrevu) ? 'payee' : 'partielle',
      },
    });
    montantRestant -= montantAffecte;
  }
}
