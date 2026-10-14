/**
 * Calculs et mises en forme des tableaux de bord et des rapports (J3.2,
 * section 23). Sans accès à la base : tout ce qui est arithmétique ou de
 * présentation est ici, pour être testé à part.
 */

export const UN_JOUR = 24 * 3600 * 1000;

/** Délais (en jours) au-delà desquels un dossier est dit « bloqué ». Réglables dans Paramètres. */
export const SEUILS_BLOCAGE_DEFAUT = {
  vente: 15,
  mission: 10,
  chantier: 7,
  prospect: 14,
  tache: 3,
} as const;

export type TypeBlocage = keyof typeof SEUILS_BLOCAGE_DEFAUT;
export type SeuilsBlocage = Record<TypeBlocage, number>;

export const CLE_SEUILS_BLOCAGE = 'pilotage.seuilsBlocage';

export function nombre(valeur: unknown): number {
  const n = Number(valeur ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** Seuils lus dans le paramètre ; une valeur absente ou absurde retombe sur le défaut. */
export function lireSeuils(valeur: unknown): SeuilsBlocage {
  const seuils: SeuilsBlocage = { ...SEUILS_BLOCAGE_DEFAUT };
  if (valeur && typeof valeur === 'object' && !Array.isArray(valeur)) {
    for (const type of Object.keys(seuils) as TypeBlocage[]) {
      const lu = (valeur as Record<string, unknown>)[type];
      if (
        typeof lu === 'number' &&
        Number.isInteger(lu) &&
        lu >= 1 &&
        lu <= 365
      ) {
        seuils[type] = lu;
      }
    }
  }
  return seuils;
}

/** Date limite : avant elle, un dossier est encore « dans les temps ». */
export function limiteDepuis(jours: number, maintenant = new Date()): Date {
  return new Date(maintenant.getTime() - jours * UN_JOUR);
}

/** Jours pleins écoulés entre deux dates (jamais négatif). */
export function joursEntre(depuis: Date, jusqua = new Date()): number {
  return Math.max(
    0,
    Math.floor((jusqua.getTime() - depuis.getTime()) / UN_JOUR),
  );
}

/** Pourcentage arrondi à une décimale ; `null` quand il n'y a pas de base. */
export function tauxPourcent(partie: number, total: number): number | null {
  if (!(total > 0)) return null;
  return Math.round((partie / total) * 1000) / 10;
}

/** Variation en % entre deux périodes ; `null` quand la période précédente est vide. */
export function variationPourcent(
  actuel: number,
  precedent: number,
): number | null {
  if (precedent === 0) return actuel === 0 ? 0 : null;
  return Math.round(((actuel - precedent) / Math.abs(precedent)) * 100);
}

export function moyenne(valeurs: number[]): number | null {
  if (valeurs.length === 0) return null;
  return Math.round(valeurs.reduce((s, v) => s + v, 0) / valeurs.length);
}

/** Clé AAAA-MM (UTC) d'une date. */
export function moisDe(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Les `n` derniers mois jusqu'à `fin` incluse, du plus ancien au plus récent. */
export function derniersMois(n: number, fin = new Date()): string[] {
  const mois: string[] = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    mois.push(
      moisDe(
        new Date(Date.UTC(fin.getUTCFullYear(), fin.getUTCMonth() - i, 1)),
      ),
    );
  }
  return mois;
}

/** Série mensuelle : un point par mois, même sans donnée. */
export function serieParMois<T>(
  mois: string[],
  lignes: T[],
  dateDe: (ligne: T) => Date | null,
  valeurDe: (ligne: T) => number,
): Array<{ periode: string; valeur: number }> {
  const totaux = new Map(mois.map((m) => [m, 0]));
  for (const ligne of lignes) {
    const date = dateDe(ligne);
    if (!date) continue;
    const cle = moisDe(date);
    if (totaux.has(cle))
      totaux.set(cle, (totaux.get(cle) ?? 0) + valeurDe(ligne));
  }
  return mois.map((periode) => ({ periode, valeur: totaux.get(periode) ?? 0 }));
}

export interface Classe<T> {
  rang: number;
  element: T;
}

/** Les `n` premiers par valeur décroissante, avec leur rang (à égalité, même rang). */
export function classer<T>(
  elements: T[],
  valeurDe: (element: T) => number,
  n: number,
): Array<Classe<T>> {
  const tries = [...elements].sort((a, b) => valeurDe(b) - valeurDe(a));
  const resultat: Array<Classe<T>> = [];
  let rang = 0;
  let precedent: number | null = null;
  tries.forEach((element, index) => {
    const valeur = valeurDe(element);
    if (valeur !== precedent) rang = index + 1;
    precedent = valeur;
    if (resultat.length < n) resultat.push({ rang, element });
  });
  return resultat;
}

// ---------------------------------------------------------------------------
// Rapports : données génériques, lues par le PDF, l'Excel et l'aperçu à l'écran
// ---------------------------------------------------------------------------

export type TypeColonne =
  'texte' | 'nombre' | 'montant' | 'pourcentage' | 'date';

export interface ColonneRapport {
  cle: string;
  libelle: string;
  type: TypeColonne;
}

export type Cellule = string | number | null;

export interface SectionRapport {
  titre: string;
  colonnes: ColonneRapport[];
  lignes: Array<Record<string, Cellule>>;
  /** Ligne de total, mêmes clés que les colonnes (les absentes restent vides). */
  total?: Record<string, Cellule>;
  /** Phrase d'aide ou de réserve imprimée sous le tableau. */
  note?: string;
}

export interface RapportDonnees {
  code: string;
  titre: string;
  sousTitre: string;
  periode: { du: string; au: string } | null;
  resume: Array<{ libelle: string; valeur: string }>;
  sections: SectionRapport[];
}

/** « 1 250 000 » : espaces insécables, sans devise (elle est dans l'en-tête de colonne ou le titre). */
export function formaterNombre(valeur: number): string {
  return Math.round(valeur)
    .toLocaleString('fr-FR')
    .replace(/\u202f/g, '\u00a0');
}

export function formaterMontant(valeur: number): string {
  return `${formaterNombre(valeur)}\u00a0FCFA`;
}

export function formaterPourcentage(valeur: number): string {
  return `${valeur.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}\u00a0%`;
}

/** « 12/10/2026 » depuis un jour ISO ou une date. */
export function formaterDate(valeur: string | Date): string {
  const date = typeof valeur === 'string' ? new Date(valeur) : valeur;
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('fr-FR', { timeZone: 'UTC' });
}

/** Texte affiché d'une cellule, selon le type de sa colonne : vide pour `null`. */
export function texteCellule(
  valeur: Cellule | undefined,
  type: TypeColonne,
): string {
  if (valeur === null || valeur === undefined || valeur === '') return '';
  switch (type) {
    case 'montant':
      return formaterNombre(Number(valeur));
    case 'nombre':
      return formaterNombre(Number(valeur));
    case 'pourcentage':
      return formaterPourcentage(Number(valeur));
    case 'date':
      return formaterDate(String(valeur));
    default:
      return String(valeur);
  }
}

/** Nom de fichier sûr : lettres, chiffres et tirets, sans accent. */
export function nomFichier(
  titre: string,
  du: string | null,
  au: string | null,
): string {
  const base = titre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return du && au ? `${base}_${du}_${au}` : base;
}
