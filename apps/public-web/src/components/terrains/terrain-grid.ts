/**
 * Grilles de cartes terrain — source unique, partagée entre le contenu réel
 * et les squelettes de chargement. Si les deux divergent, la mise en page
 * saute au moment où les données arrivent.
 */

/**
 * Catalogue : 2 colonnes dès le téléphone (cartes compactes), 3 sur portable,
 * 4 à partir de 1280 px — seuil en dessous duquel une carte passerait sous
 * 230 px et le prix se replierait. Écart réduit sur mobile pour laisser la
 * place au contenu.
 */
export const CATALOG_GRID = 'grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4';

/**
 * Sélection de l'accueil : vitrine de 6 terrains, 3 colonnes maximum pour
 * deux lignes pleines (4 colonnes laisserait 2 cartes orphelines). Sur
 * téléphone, 2 colonnes compactes comme le catalogue : 6 cartes empilées
 * sur une colonne faisaient à elles seules 3 000 px de page.
 */
export const FEATURED_GRID = 'grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3';
