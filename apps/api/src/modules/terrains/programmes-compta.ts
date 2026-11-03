/**
 * Ce que la comptabilité attend de chaque lot vendu, et comment un programme le lui donne.
 *
 * La comptabilité déduit le revenu de MTM de deux montants portés par le terrain :
 * - la **commission** quand le bien est confié par un propriétaire (et que MTM n'en est pas
 *   détentrice directe) : le reste de l'argent encaissé revient au propriétaire ;
 * - la **marge** quand le bien est à MTM (en propre ou produit direct).
 * Un lot qui n'a ni l'un ni l'autre rapporterait zéro dans les comptes, et son propriétaire
 * n'apparaîtrait jamais dans les reversements. Le programme porte donc ces montants une fois
 * et les copie sur chacun de ses lots, comme ses autres conditions.
 */

type Montant = number | string | { toString(): string } | null | undefined;

export type ProgrammeCompta = {
  proprietaireId: string | null;
  produitDirect: boolean;
  commissionLot: Montant;
  margeLot: Montant;
};

export type CategorieCompta = {
  commission: Montant;
  marge: Montant;
};

/** Donnée sensible : réservée à la direction et aux personnes qui ont le droit « financier ». */
export function aAccesFinancier(user?: {
  roles?: string[];
  permissions?: string[];
}): boolean {
  return (
    !user ||
    Boolean(user.roles?.includes('administrateur')) ||
    Boolean(user.roles?.includes('direction')) ||
    Boolean(user.permissions?.includes('terrains:consulter_financier'))
  );
}

const present = (valeur: Montant): boolean =>
  valeur !== null && valeur !== undefined;

/** Un bien confié par un propriétaire, que MTM ne détient pas directement : il rapporte une commission. */
export function estConfie(bien: {
  proprietaireId: string | null;
  produitDirect: boolean;
}): boolean {
  return Boolean(bien.proprietaireId) && !bien.produitDirect;
}

/** Ce qu'un lot du programme (ou de l'une de ses catégories) reçoit pour la comptabilité. */
export function comptaDuLot(
  programme: ProgrammeCompta,
  categorie?: CategorieCompta | null,
) {
  return {
    proprietaireId: programme.proprietaireId,
    produitDirect: programme.produitDirect,
    commission: present(categorie?.commission)
      ? categorie?.commission
      : programme.commissionLot,
    marge: present(categorie?.marge) ? categorie?.marge : programme.margeLot,
  };
}

/** Un lot est prêt pour la comptabilité quand il porte le montant que son type de bien exige. */
export function lotComptaComplete(lot: {
  proprietaireId: string | null;
  produitDirect: boolean;
  commission: Montant;
  marge: Montant;
}): boolean {
  return estConfie(lot) ? present(lot.commission) : present(lot.marge);
}

/** Le montant qui manque, nommé comme l'utilisateur le connaît. */
export function montantManquant(lot: {
  proprietaireId: string | null;
  produitDirect: boolean;
}): 'commission' | 'marge' {
  return estConfie(lot) ? 'commission' : 'marge';
}

/**
 * Le programme (avec ses catégories) est-il complet pour la comptabilité ? Une catégorie complète
 * par défaut avec la valeur du programme ; seule une valeur absente partout est un manque.
 */
export function comptaProgrammeComplete(
  programme: ProgrammeCompta,
  categories: CategorieCompta[] = [],
): boolean {
  const base = comptaDuLot(programme);
  const complet = (c: ReturnType<typeof comptaDuLot>) => lotComptaComplete(c);
  return (
    complet(base) ||
    (categories.length > 0 &&
      categories.every((cat) => complet(comptaDuLot(programme, cat))))
  );
}

/** Retire les montants internes (commission, marge) à qui n'a pas le droit de les voir. */
export function masquerFinancier<
  T extends {
    commissionLot?: unknown;
    margeLot?: unknown;
    categories?: Array<Record<string, unknown>>;
  },
>(programme: T, acces: boolean): T {
  if (acces) return programme;
  return {
    ...programme,
    commissionLot: null,
    margeLot: null,
    ...(programme.categories
      ? {
          categories: programme.categories.map((c) => ({
            ...c,
            commission: null,
            marge: null,
          })),
        }
      : {}),
  };
}
