export type NumericOrString = number | string | null;

export interface ProprietaireSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  notes?: string | null;
  /** Renvoyé par la liste et la fiche : terrains et mandats rattachés. */
  _count?: { terrains: number; mandats: number };
}

export interface TerrainListItem {
  id: string;
  referenceInterne: string;
  nom: string;
  parcelleMatricule: string | null;
  statutJuridique: string;
  typeDocumentFoncier: string | null;
  niveauVerification: string;
  region: string | null;
  commune: string | null;
  /** Nature du bien : terrain nu, villa, appartement… */
  typeBien: string;
  /** Surface de la parcelle. */
  superficie: NumericOrString;
  /** Surface habitable, nulle sur un terrain nu. */
  surfaceHabitable: NumericOrString;
  /** Typologie commerciale d'un bien bâti : F1 à F6. */
  nombrePieces: string | null;
  prixPublic: NumericOrString;
  statutCommercial: string;
  misEnAvant: boolean;
  /** Bien vendu affiché sur le site public comme référence (badge « Vendu », sans prix). */
  referenceVendue?: boolean;
  medias?: TerrainMedia[];
  // --- Suivi du portefeuille (reprise du tableur historique) ---
  /** Nombre de lots : un lotissement compte plusieurs terrains. */
  nombreLots?: number | null;
  /** Date d'entrée du bien dans le portefeuille (AAAA-MM-JJ…). */
  dateEntree?: string | null;
  modalitePaiement?: string | null;
  statutVisite?: string | null;
  produitDirect?: boolean;
  protocoleAccord?: boolean;
  /** Mandataire propre à ce bien ; à défaut, le propriétaire. */
  contactVendeurNom?: string | null;
  contactVendeurTelephone?: string | null;
  localisationDetail?: string | null;
  /** Renseignée seulement pour un bien archivé. */
  archiveLe?: string | null;
  /** Renvoyé par la liste (sélection réduite) ; complet dans TerrainDetail. */
  proprietaire?: { id: string; firstName: string; lastName: string; phone?: string | null } | null;
}

export interface TerrainDetail extends TerrainListItem {
  latitude: NumericOrString;
  longitude: NumericOrString;
  dimensions: unknown;
  prixAcquisition: NumericOrString;
  marge: NumericOrString;
  commission: NumericOrString;
  /** Prix de cession : interne, masqué sans accès financier. */
  prixCession: NumericOrString;
  dureeMoratoireMois: number | null;
  acompteMontant: NumericOrString;
  notesPaiement: string | null;
  referenceDocumentFoncier: string | null;
  dateDocumentFoncier: string | null;
  commentaireAdministratif: string | null;
  motifArchivage: string | null;
  accesRoutier: string | null;
  eauDisponible: boolean | null;
  electriciteDisponible: boolean | null;
  voisinage: string | null;
  vocation: string | null;
  // --- Caractéristiques du bâti, nulles sur un terrain nu ---
  nombreChambres: number | null;
  nombreSallesEau: number | null;
  niveaux: number | null;
  anneeConstruction: number | null;
  etatBien: string | null;
  proximiteAxes: string | null;
  pointsInteret: TerrainPointInteret[] | null;
  description: string | null;
  notesInternes: string | null;
  proprietaire: ProprietaireSummary | null;
  commercialResponsable: { id: string; firstName: string; lastName: string } | null;
  createdAt: string;
  updatedAt: string;
  medias: TerrainMedia[];
  documents: TerrainDocument[];
}

export interface TerrainMedia {
  id: string;
  type: string;
  title: string | null;
  isPublic: boolean;
  storageKey: string;
  resourceType: string;
  secureUrl: string;
}

export interface TerrainDocument {
  id: string;
  type: string;
  title: string | null;
  isPublic: boolean;
  storageKey: string;
  resourceType: string;
  secureUrl: string;
  version: number;
}

/** Réglages d'un import de tableur (onglet, archives, publication). */
export interface TerrainImportOptions {
  feuille?: string;
  /** Onglet ARCHIVES : les biens sont repris déjà archivés. */
  archives?: boolean;
  /** Publie les biens « Disponible » ; sinon tout est repris en Brouillon. */
  publierDisponibles?: boolean;
}

/** Réponse de l'aperçu : ce que l'import ferait, sans rien écrire. */
export interface TerrainImportPreview {
  feuilles: string[];
  feuille: string;
  aCreer: number;
  dejaPresents: number;
  refuses: number;
  ignorees: number;
  nombreAvertissements: number;
  lignesRefusees: { ligne: number; raison: string }[];
  avertissements: { ligne: number; message: string }[];
  apercu: {
    ligne: number;
    referenceInterne: string;
    nom: string;
    statutJuridique: string;
    statutCommercial: string;
    nombreLots: number | null;
    superficie: number | null;
    prixPublic: number | null;
    contact: string | null;
    modalitePaiement: string | null;
  }[];
}

export interface TerrainImportResult extends TerrainImportPreview {
  crees: number;
}

export interface TerrainPage {
  items: TerrainListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TerrainQuery {
  search?: string;
  statutJuridique?: string;
  niveauVerification?: string;
  statutCommercial?: string;
  vocation?: string;
  /** Nature du bien — à ne pas confondre avec `vocation`, l'usage du sol. */
  typeBien?: string;
  nombrePieces?: string;
  proprietaireId?: string;
  /** `actifs` (défaut), `archives` ou `tous`. */
  archivage?: 'actifs' | 'archives' | 'tous';
  modalitePaiement?: string;
  statutVisite?: string;
  produitDirect?: boolean;
  protocoleAccord?: boolean;
  dateEntreeMin?: string;
  dateEntreeMax?: string;
  superficieMin?: number;
  superficieMax?: number;
  prixPublicMin?: number;
  prixPublicMax?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface TerrainPointInteret {
  nom: string;
  type?: string;
  distanceKm?: number;
  latitude?: number;
  longitude?: number;
}

/** Synthèse du portefeuille (GET /terrains/stats). */
export interface TerrainStats {
  total: number;
  /** Biens archivés, hors du portefeuille actif. */
  archives?: number;
  parStatut: Partial<Record<string, number>>;
  misEnAvant: number;
  sansGps: number;
  nonVerifies: number;
  sansPhotoPublique: number;
}

export interface TerrainOptions {
  statutJuridique: string[];
  niveauVerification: string[];
  statutCommercial: string[];
  typeBien: string[];
  nombrePieces: string[];
  etatBien: string[];
  /** Usage prévu du sol, désormais contrôlé et non plus saisi librement. */
  vocation: string[];
  /** Cash, Moratoire… (paramétrable). */
  modalitePaiement: string[];
  /** À visiter, Visité… (paramétrable). */
  statutVisite: string[];
  /**
   * Types qui ouvrent la section « bâti » du formulaire. L'API en est la
   * source : les écrans n'ont pas à deviner qu'un studio est bâti et un
   * terrain non.
   */
  typesBati: string[];
}

export interface CreateTerrainPayload {
  referenceInterne: string;
  nom: string;
  parcelleMatricule?: string;
  proprietaireId?: string;
  statutJuridique: string;
  typeDocumentFoncier?: string;
  niveauVerification: string;
  region?: string;
  commune?: string;
  localisationDetail?: string;
  latitude?: number;
  longitude?: number;
  typeBien?: string;
  superficie?: number;
  uniteSuperficie?: string;
  dimensions?: Record<string, unknown>;
  // --- Caractéristiques du bâti : refusées par l'API sur un terrain nu ---
  surfaceHabitable?: number;
  nombrePieces?: string;
  nombreChambres?: number;
  nombreSallesEau?: number;
  niveaux?: number;
  anneeConstruction?: number;
  etatBien?: string;
  prixAcquisition?: number;
  prixPublic?: number;
  marge?: number;
  commission?: number;
  prixCession?: number;
  nombreLots?: number;
  dateEntree?: string;
  modalitePaiement?: string;
  dureeMoratoireMois?: number;
  acompteMontant?: number;
  notesPaiement?: string;
  produitDirect?: boolean;
  protocoleAccord?: boolean;
  statutVisite?: string;
  contactVendeurNom?: string;
  contactVendeurTelephone?: string;
  referenceDocumentFoncier?: string;
  dateDocumentFoncier?: string;
  commentaireAdministratif?: string;
  statutCommercial: string;
  accesRoutier?: string;
  misEnAvant?: boolean;
  eauDisponible?: boolean;
  electriciteDisponible?: boolean;
  voisinage?: string;
  vocation?: string;
  proximiteAxes?: string;
  pointsInteret?: TerrainPointInteret[];
  description?: string;
  notesInternes?: string;
  commercialResponsableId?: string;
  /** Obligatoire côté API si un champ sensible (prix, marge, commission, propriétaire) est modifié. */
  justification?: string;
}

/**
 * Terrain tel qu'on le propose à un prospect : seulement ce qu'on dit au
 * client. Le catalogue ignore le responsable du terrain, car proposer un
 * terrain n'est pas le gérer.
 */
export interface TerrainCatalogueItem {
  id: string;
  referenceInterne: string;
  nom: string;
  commune: string | null;
  region: string | null;
  superficie: number | null;
  prixPublic: number | null;
  statutCommercial: string;
}
