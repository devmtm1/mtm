/**
 * Calculs du relevé de gestion d'une propriété (villa, immeuble, résidence) : les loyers de chaque logement, les
 * charges communes et ce qui revient au propriétaire. Fonctions pures : le service lit la base, ce fichier compte.
 *
 * Les charges communes restent à la charge du propriétaire (elles viennent en déduction de son reversement). La
 * répartition entre logements ne change donc pas le total : elle montre à chacun, et au propriétaire, la part de
 * chaque appartement.
 */

export const REPARTITIONS_CHARGE = [
  'egale',
  'surface',
  'loyer',
  'globale',
] as const;
export type RepartitionCharge = (typeof REPARTITIONS_CHARGE)[number];

export const LIBELLES_REPARTITION: Record<RepartitionCharge, string> = {
  egale: 'Parts égales',
  surface: 'Au prorata de la surface',
  loyer: 'Au prorata du loyer',
  globale: 'Non répartie',
};

export interface LogementReleve {
  id: string;
  /** « A1 » ou, à défaut, la référence du bien. */
  libelle: string;
  locataire: string | null;
  loyerMensuel: number;
  /** Surface en m² : sert à la répartition « au prorata de la surface » (0 si inconnue). */
  superficie: number;
  du: number;
  encaisse: number;
}

export interface ChargeReleve {
  id: string;
  libelle: string;
  montant: number;
  dateCharge: Date;
  repartition: RepartitionCharge;
}

export interface LigneLogement extends LogementReleve {
  solde: number;
  /** Part des charges communes réparties sur ce logement. */
  chargesImputees: number;
}

export interface ReleveImmeubleCalcule {
  logements: LigneLogement[];
  charges: ChargeReleve[];
  totalDu: number;
  totalEncaisse: number;
  totalSolde: number;
  totalCharges: number;
  /** Encaissé moins les charges communes, avant la commission de gestion. */
  net: number;
}

/**
 * Découpe un montant en parts entières dont la somme est exacte : le reste de la division va aux premiers logements,
 * un franc chacun, pour que le total reste celui de la facture.
 */
export function repartirMontant(montant: number, poids: number[]): number[] {
  const somme = poids.reduce((total, poids) => total + poids, 0);
  if (poids.length === 0) return [];
  const brutes =
    somme > 0
      ? poids.map((p) => (montant * p) / somme)
      : poids.map(() => montant / poids.length);
  const parts = brutes.map((part) => Math.floor(part));
  let reste =
    Math.round(montant) - parts.reduce((total, part) => total + part, 0);
  for (let i = 0; reste > 0; i = (i + 1) % parts.length) {
    parts[i] += 1;
    reste -= 1;
  }
  return parts;
}

export function calculerReleveImmeuble(
  logements: LogementReleve[],
  charges: ChargeReleve[],
): ReleveImmeubleCalcule {
  const imputees = new Map<string, number>(logements.map((l) => [l.id, 0]));
  for (const charge of charges) {
    if (charge.repartition === 'globale' || logements.length === 0) continue;
    const poids =
      charge.repartition === 'loyer'
        ? logements.map((l) => l.loyerMensuel)
        : charge.repartition === 'surface'
          ? logements.map((l) => l.superficie)
          : logements.map(() => 1);
    repartirMontant(charge.montant, poids).forEach((part, index) => {
      const id = logements[index].id;
      imputees.set(id, (imputees.get(id) ?? 0) + part);
    });
  }

  const lignes: LigneLogement[] = logements.map((logement) => ({
    ...logement,
    solde: logement.du - logement.encaisse,
    chargesImputees: imputees.get(logement.id) ?? 0,
  }));
  const totalDu = lignes.reduce((somme, l) => somme + l.du, 0);
  const totalEncaisse = lignes.reduce((somme, l) => somme + l.encaisse, 0);
  const totalCharges = charges.reduce((somme, c) => somme + c.montant, 0);
  return {
    logements: lignes,
    charges,
    totalDu,
    totalEncaisse,
    totalSolde: totalDu - totalEncaisse,
    totalCharges,
    net: totalEncaisse - totalCharges,
  };
}
