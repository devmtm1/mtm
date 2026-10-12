/**
 * Calculs financiers de J3.1 (section 18). Tout ce qui est arithmétique ou de
 * mise en forme est ici, sans accès à la base, pour être testé à part.
 */

export const ACTIVITES = [
  'vente',
  'locatif',
  'demarches',
  'construction',
  'general',
] as const;
export type Activite = (typeof ACTIVITES)[number];

export const LIBELLES_ACTIVITE: Record<Activite, string> = {
  vente: 'Vente de biens',
  locatif: 'Gestion locative',
  demarches: 'Démarches et vérifications',
  construction: 'Construction',
  general: 'Général (hors activité)',
};

/** Ce qu'une ligne du journal représente : l'origine du mouvement. */
export type NatureLigne =
  | 'encaissement_vente'
  | 'commission_commercial'
  | 'loyer'
  | 'sejour'
  | 'mission'
  | 'frais_operateur'
  | 'depense_chantier'
  | 'operation_recette'
  | 'operation_depense';

export const LIBELLES_NATURE: Record<NatureLigne, string> = {
  encaissement_vente: 'Encaissement de vente',
  commission_commercial: 'Commission de commercial',
  loyer: 'Loyer encaissé',
  sejour: 'Séjour encaissé',
  mission: 'Règlement de mission',
  frais_operateur: 'Frais de transfert',
  depense_chantier: 'Dépense de chantier',
  operation_recette: 'Recette saisie',
  operation_depense: 'Dépense saisie',
};

/** Une ligne du journal financier : un mouvement d'argent, d'où qu'il vienne. */
export interface LigneJournal {
  id: string;
  date: Date;
  activite: Activite;
  /** entree : de l'argent reçu ; sortie : de l'argent dépensé. */
  sens: 'entree' | 'sortie';
  nature: NatureLigne;
  libelle: string;
  tiers: string | null;
  reference: string | null;
  mode: string | null;
  /** Toujours positif ; le sens dit s'il entre ou sort. */
  montant: number;
  /** Part de cette entrée qui est un revenu de MTM (commission, marge, honoraires, prestation). */
  revenu: number;
  /** Route du back-office du dossier concerné. */
  lien: string | null;
}

/** Arrondi à l'unité : le franc CFA n'a pas de centime en pratique. */
export function arrondir(valeur: number): number {
  return Math.round(valeur);
}

export function nombre(valeur: unknown): number {
  const n = Number(valeur ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** « 2026-10 » pour un instant donné (UTC : une période ne doit pas changer selon le poste). */
export function moisDe(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function periodeValide(periode: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(periode);
}

/** Du premier jour du mois (inclus) au premier jour du mois suivant (exclu). */
export function bornesMois(periode: string): { debut: Date; fin: Date } {
  const [annee, mois] = periode.split('-').map(Number);
  return {
    debut: new Date(Date.UTC(annee, mois - 1, 1)),
    fin: new Date(Date.UTC(annee, mois, 1)),
  };
}

/** Liste des mois (AAAA-MM) couverts par [du, au[. */
export function moisCouverts(du: Date, au: Date): string[] {
  const mois: string[] = [];
  const courant = new Date(Date.UTC(du.getUTCFullYear(), du.getUTCMonth(), 1));
  while (courant < au) {
    mois.push(moisDe(courant));
    courant.setUTCMonth(courant.getUTCMonth() + 1);
  }
  return mois;
}

/** Honoraires de gestion : `taux` est un pourcentage (10 pour 10 %). */
export function honoraires(montant: number, taux: number): number {
  return arrondir((montant * taux) / 100);
}

/**
 * Part de la marge d'un bien reconnue par un encaissement : la marge est
 * acquise au prorata de ce que le client a payé du prix de vente. Chaque
 * paiement porte donc sa part, et la somme sur toutes les périodes retombe
 * exactement sur la marge quand la vente est soldée.
 */
export function margeReconnue(
  marge: number | null,
  paiement: number,
  prixVente: number,
): number {
  if (marge === null || !(prixVente > 0) || !(paiement > 0)) return 0;
  return arrondir((marge * paiement) / prixVente);
}

export interface TotauxActivite {
  encaissements: number;
  revenu: number;
  depenses: number;
  resultat: number;
}

export function totauxVides(): TotauxActivite {
  return { encaissements: 0, revenu: 0, depenses: 0, resultat: 0 };
}

/** Totaux par activité et au global, à partir des lignes du journal. */
export function totaliser(lignes: LigneJournal[]): {
  global: TotauxActivite;
  parActivite: Record<Activite, TotauxActivite>;
} {
  const parActivite = Object.fromEntries(
    ACTIVITES.map((activite) => [activite, totauxVides()]),
  ) as Record<Activite, TotauxActivite>;
  const global = totauxVides();
  for (const ligne of lignes) {
    for (const cible of [parActivite[ligne.activite], global]) {
      if (ligne.sens === 'entree') {
        cible.encaissements += ligne.montant;
        cible.revenu += ligne.revenu;
      } else {
        cible.depenses += ligne.montant;
      }
    }
  }
  for (const cible of [global, ...Object.values(parActivite)]) {
    cible.resultat = cible.revenu - cible.depenses;
  }
  return { global, parActivite };
}

export interface PointSerie {
  periode: string;
  encaissements: number;
  revenu: number;
  depenses: number;
}

/** Une ligne par mois de la période, même sans mouvement : le graphique ne saute pas de mois. */
export function serieMensuelle(
  lignes: LigneJournal[],
  du: Date,
  au: Date,
): PointSerie[] {
  const points = new Map<string, PointSerie>(
    moisCouverts(du, au).map((periode) => [
      periode,
      { periode, encaissements: 0, revenu: 0, depenses: 0 },
    ]),
  );
  for (const ligne of lignes) {
    const point = points.get(moisDe(ligne.date));
    if (!point) continue;
    if (ligne.sens === 'entree') {
      point.encaissements += ligne.montant;
      point.revenu += ligne.revenu;
    } else {
      point.depenses += ligne.montant;
    }
  }
  return [...points.values()];
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const ENTETES_EXPORT = [
  'Date',
  'Activité',
  'Nature',
  'Libellé',
  'Tiers',
  'Référence',
  'Mode',
  'Entrée',
  'Sortie',
  'Revenu MTM',
] as const;

/** Nombre au format français sans séparateur de milliers : « 1234,5 ». */
export function nombreFrancais(valeur: number): string {
  return String(valeur).replace('.', ',');
}

/** Cellule CSV : guillemets doublés, et une formule (=, +, -, @) neutralisée pour qu'un tableur ne l'exécute pas. */
export function celluleCsv(valeur: string): string {
  const neutre = /^[=+\-@\t\r]/.test(valeur) ? `'${valeur}` : valeur;
  return /[";\n\r]/.test(neutre) ? `"${neutre.replace(/"/g, '""')}"` : neutre;
}

export function jourIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function ligneExport(ligne: LigneJournal): string[] {
  return [
    jourIso(ligne.date),
    LIBELLES_ACTIVITE[ligne.activite],
    LIBELLES_NATURE[ligne.nature],
    ligne.libelle,
    ligne.tiers ?? '',
    ligne.reference ?? '',
    ligne.mode ?? '',
    ligne.sens === 'entree' ? nombreFrancais(ligne.montant) : '',
    ligne.sens === 'sortie' ? nombreFrancais(ligne.montant) : '',
    ligne.sens === 'entree' && ligne.revenu ? nombreFrancais(ligne.revenu) : '',
  ];
}

/**
 * CSV ouvrable tel quel dans Excel en français : séparateur « ; », virgule
 * décimale, UTF-8 avec marque d'ordre des octets pour les accents.
 */
export function versCsv(lignes: LigneJournal[]): Buffer {
  const corps = [ENTETES_EXPORT.map(String), ...lignes.map(ligneExport)]
    .map((cellules) => cellules.map(celluleCsv).join(';'))
    .join('\r\n');
  return Buffer.from(`\uFEFF${corps}\r\n`, 'utf8');
}
