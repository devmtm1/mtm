/**
 * Règles du patrimoine matériel de MTM : mobilier, informatique, véhicules, outillage…
 * Chaque objet porte un autocollant « MTM 0003 » ; son `numero` est ce nombre, unique et jamais réutilisé.
 */

export const ETATS_MATERIEL = ['neuf', 'bon', 'usage', 'en_panne'] as const;
export type EtatMateriel = (typeof ETATS_MATERIEL)[number];

export const LIBELLES_ETAT: Record<EtatMateriel, string> = {
  neuf: 'Neuf',
  bon: 'Bon état',
  usage: 'Usé',
  en_panne: 'En panne',
};

export const STATUTS_MATERIEL = [
  'disponible',
  'affecte',
  'en_maintenance',
  'sorti',
] as const;
export type StatutMateriel = (typeof STATUTS_MATERIEL)[number];

export const LIBELLES_STATUT: Record<StatutMateriel, string> = {
  disponible: 'Disponible',
  affecte: 'Confié',
  en_maintenance: 'En maintenance',
  sorti: 'Sorti du parc',
};

/** Comment un objet quitte le parc : il n'est jamais supprimé, on garde sa fiche et son historique. */
export const TYPES_SORTIE = [
  'vendu',
  'reforme',
  'perdu',
  'vole',
  'donne',
] as const;
export type TypeSortie = (typeof TYPES_SORTIE)[number];

export const LIBELLES_SORTIE: Record<TypeSortie, string> = {
  vendu: 'Vendu',
  reforme: 'Réformé (mis au rebut)',
  perdu: 'Perdu',
  vole: 'Volé',
  donne: 'Donné',
};

export const TYPES_ENTRETIEN = ['preventif', 'reparation', 'controle'] as const;
export const ROLES_FICHIER = [
  'photo',
  'etiquette',
  'facture',
  'autre',
] as const;

/** Catégories et lieux proposés tant que MTM n'a pas réglé les siens (Paramètres → Patrimoine matériel). */
export const CLE_CATEGORIES = 'materiel.categories';
export const CLE_LIEUX = 'materiel.lieux';
export const CATEGORIES_DEFAUT = [
  'Mobilier',
  'Informatique',
  'Téléphonie',
  'Véhicule',
  'Outillage',
  'Électroménager',
  'Climatisation',
  'Matériel de bureau',
  'Autre',
];
export const LIEUX_DEFAUT = [
  'Direction',
  'Accueil',
  'Salle de réunion',
  'Bureau commercial',
  'Secrétariat',
  'Dépôt',
];

/** Délais d'avertissement (jours) : un entretien prévu et une garantie qui se termine sont signalés à l'avance. */
export const DELAI_AVERTISSEMENT_ENTRETIEN_JOURS = 7;
export const DELAI_AVERTISSEMENT_GARANTIE_JOURS = 30;

/** « MTM 0003 » pour le numéro 3. */
export function formaterNumero(numero: number): string {
  return `MTM ${String(numero).padStart(4, '0')}`;
}

/**
 * Lit un numéro tel qu'on le tape ou le lit sur l'autocollant : « 3 », « 0003 », « MTM 0003 », « mtm-3 ».
 * Renvoie `null` si ce n'est pas un numéro (la recherche tombe alors sur le texte).
 */
export function lireNumero(texte: string | null | undefined): number | null {
  const propre = (texte ?? '').trim().replace(/^mtm[\s\-_.]*/i, '');
  if (!/^\d{1,9}$/.test(propre)) return null;
  const numero = Number.parseInt(propre, 10);
  return numero > 0 ? numero : null;
}

export function estEtat(valeur: string): valeur is EtatMateriel {
  return (ETATS_MATERIEL as readonly string[]).includes(valeur);
}

/** Un objet sorti du parc ne se modifie plus. */
export function estSorti(statut: string): boolean {
  return statut === 'sorti';
}

/** La garantie court encore à `maintenant` (la date de fin est incluse). */
export function garantieActive(
  garantieJusqua: Date | null,
  maintenant: Date = new Date(),
): boolean {
  if (!garantieJusqua) return false;
  const fin = new Date(garantieJusqua);
  fin.setUTCHours(23, 59, 59, 999);
  return fin.getTime() >= maintenant.getTime();
}

/** Le jour (AAAA-MM-JJ) d'une date, en UTC : les dates d'entretien sont des jours, pas des instants. */
export function jour(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Aujourd'hui à minuit UTC, pour comparer à une colonne `date`. */
export function aujourdhui(maintenant: Date = new Date()): Date {
  return new Date(`${jour(maintenant)}T00:00:00.000Z`);
}
