import type { Prisma } from '@prisma/client';

// Second critère indispensable : les médias ajoutés en back-office partagent
// souvent le même sortOrder (0), et sans lui l'ordre — donc la photo de
// couverture — changeait d'une requête à l'autre.
export const mediaOrderBy: Prisma.TerrainMediaOrderByWithRelationInput[] = [
  { sortOrder: 'asc' },
  { createdAt: 'asc' },
];

/**
 * Projection publique d'un terrain — LISTE BLANCHE. Tout champ absent ici
 * n'existe pas pour le site public : prix d'acquisition, marge, commission,
 * notes internes, propriétaire et commercial ne doivent jamais y figurer
 * (section 11 du cahier des charges). Vérifié par test e2e.
 */
export const publicTerrainSelect = {
  id: true,
  statutCommercial: true,
  referenceInterne: true,
  nom: true,
  statutJuridique: true,
  niveauVerification: true,
  region: true,
  commune: true,
  localisationDetail: true,
  latitude: true,
  longitude: true,
  typeBien: true,
  superficie: true,
  uniteSuperficie: true,
  dimensions: true,
  // Caractéristiques du bâti : publiques comme la superficie, ce sont les
  // premiers critères que regarde un acheteur de villa.
  surfaceHabitable: true,
  nombrePieces: true,
  nombreChambres: true,
  nombreSallesEau: true,
  niveaux: true,
  anneeConstruction: true,
  etatBien: true,
  prixPublic: true,
  misEnAvant: true,
  description: true,
  accesRoutier: true,
  eauDisponible: true,
  electriciteDisponible: true,
  voisinage: true,
  vocation: true,
  proximiteAxes: true,
  pointsInteret: true,
  medias: {
    where: { isPublic: true },
    orderBy: mediaOrderBy,
  },
  documents: {
    where: { isPublic: true },
    orderBy: { createdAt: 'desc' as const },
  },
} as const;

/**
 * Projection d'un bien vendu affiché comme référence : la liste blanche
 * ci-dessus, plus la date de la vente (le dossier soldé le plus récent). La
 * réponse publique en masque ensuite le prix, la position exacte et les
 * documents (voir `toPublicVendu`).
 */
export const publicVenduSelect = {
  ...publicTerrainSelect,
  dossiers: {
    where: { statut: 'solde', dateVente: { not: null } },
    orderBy: { dateVente: 'desc' as const },
    take: 1,
    select: { dateVente: true },
  },
} as const;
