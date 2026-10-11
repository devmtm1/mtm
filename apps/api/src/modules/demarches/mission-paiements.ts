/**
 * Situation de règlement d'une mission : ce qui a été convenu, ce que le client
 * a envoyé, les frais de transfert et ce qu'il reste à payer.
 *
 * Le solde se calcule sur le montant **envoyé** par le client, pas sur le net
 * reçu : les frais Wave ou Orange Money sont un coût du transfert, distinct du
 * prix de la prestation (ils ne rallongent pas ce que le client doit).
 */

export type StatutReglement =
  'a_facturer' | 'non_regle' | 'partiel' | 'solde' | 'trop_percu';

export interface LignePaiement {
  montantEnvoye: number;
  frais: number;
  montantNet: number;
}

export interface SyntheseReglement {
  montantConvenu: number | null;
  totalEnvoye: number;
  totalFrais: number;
  totalNet: number;
  /** Reste dû par le client (0 une fois soldé) ; `null` tant que le prix n'est pas fixé. */
  solde: number | null;
  /** Somme versée au-delà du prix convenu. */
  excedent: number;
  statut: StatutReglement;
}

const arrondi = (valeur: number): number => Math.round(valeur * 100) / 100;

export function syntheseReglement(
  montantConvenu: number | null | undefined,
  paiements: LignePaiement[],
): SyntheseReglement {
  const somme = (cle: keyof LignePaiement) =>
    arrondi(paiements.reduce((total, ligne) => total + ligne[cle], 0));
  const totalEnvoye = somme('montantEnvoye');
  const totalFrais = somme('frais');
  const totalNet = somme('montantNet');
  const convenu =
    montantConvenu !== null &&
    montantConvenu !== undefined &&
    montantConvenu > 0
      ? montantConvenu
      : null;

  if (convenu === null) {
    return {
      montantConvenu: null,
      totalEnvoye,
      totalFrais,
      totalNet,
      solde: null,
      excedent: 0,
      statut: 'a_facturer',
    };
  }
  const reste = arrondi(convenu - totalEnvoye);
  return {
    montantConvenu: convenu,
    totalEnvoye,
    totalFrais,
    totalNet,
    solde: Math.max(reste, 0),
    excedent: Math.max(-reste, 0),
    statut:
      totalEnvoye === 0
        ? 'non_regle'
        : reste > 0
          ? 'partiel'
          : reste === 0
            ? 'solde'
            : 'trop_percu',
  };
}

export const LIBELLES_REGLEMENT: Record<StatutReglement, string> = {
  a_facturer: 'Prix à fixer',
  non_regle: 'Non réglé',
  partiel: 'Partiellement réglé',
  solde: 'Soldé',
  trop_percu: 'Trop-perçu',
};
