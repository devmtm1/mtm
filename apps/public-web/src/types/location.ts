/** Photo ou vidéo d'une annonce de location. */
export interface LocationMedia {
  id: string;
  type: 'photo' | 'video';
  title: string | null;
  secureUrl: string;
}

/** Un autre logement libre de la même propriété. */
export interface AutreLogement {
  id: string;
  titre: string | null;
  type: string;
  numeroLot: string | null;
  modeLocation: 'longue_duree' | 'courte_duree';
  nombreChambres: number | null;
  loyerMensuel: number | null;
  prixNuit: number | null;
}

/** La propriété (villa divisée, résidence) dont l'annonce est un logement : son nom, jamais son adresse exacte. */
export interface ImmeubleAnnonce {
  nom: string;
  type: string;
  autresLogements: AutreLogement[];
}

/**
 * Annonce de location telle que le site public la reçoit. L'API ne renvoie
 * ni l'adresse exacte, ni le propriétaire, ni les notes internes : la
 * position, elle, est arrondie au quartier.
 */
export interface Location {
  id: string;
  referenceInterne: string;
  type: string;
  titre: string | null;
  description: string | null;
  commune: string | null;
  region: string | null;
  /** Repère du logement dans sa propriété (A2, 2e étage…) et la propriété elle-même, s'il y en a une. */
  numeroLot?: string | null;
  immeuble?: ImmeubleAnnonce | null;
  superficie: number | null;
  loyerMensuel: number | null;
  charges: number | null;
  moisCaution: number | null;
  montantCaution: number | null;
  nombrePieces: number | null;
  nombreChambres: number | null;
  nombreSallesEau: number | null;
  meuble: boolean;
  equipements: string[];
  latitude: number | null;
  longitude: number | null;
  disponibleLe: string | null;
  misEnAvant: boolean;
  publieLe: string | null;
  medias: LocationMedia[];
  /** « longue_duree » : loyer mensuel et bail ; « courte_duree » : séjours à la nuit (type Airbnb). */
  modeLocation: 'longue_duree' | 'courte_duree';
  prixNuit: number | null;
  fraisMenage: number | null;
  nuitsMinimum: number;
  capaciteVoyageurs: number | null;
  /** Heures d'arrivée et de départ (HH:MM). */
  heureArrivee: string | null;
  heureDepart: string | null;
}

export type LocationSortKey = 'recent' | 'loyer_asc' | 'loyer_desc' | 'superficie_desc';

export interface LocationFilters {
  search?: string;
  type?: string;
  region?: string;
  commune?: string;
  loyerMin?: number;
  loyerMax?: number;
  chambresMin?: number;
  superficieMin?: number;
  meuble?: boolean;
  misEnAvant?: boolean;
  /** « courte_duree » : seulement les biens loués à la nuit. */
  mode?: string;
  sortBy?: 'createdAt' | 'loyerMensuel' | 'prixNuit' | 'superficie';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface LocationPage {
  items: Location[];
  total: number;
  page: number;
  pageSize: number;
}

/** Valeurs proposées par les filtres, dérivées des annonces visibles. */
export interface LocationFilterOptions {
  type: string[];
  region: string[];
  commune: string[];
  chambres: number[];
  loyerMin: number | null;
  loyerMax: number | null;
  total: number;
  /** Nombre d'annonces à la nuit et au mois : le sélecteur n'apparaît que s'il y a le choix. */
  sejours: number;
  longueDuree: number;
  prixNuitMin: number | null;
  prixNuitMax: number | null;
}

/** Nuits déjà prises d'un bien loué à la nuit : « debut » est l'arrivée, « fin » le départ (jour libre). */
export interface PeriodeIndisponible {
  debut: string;
  fin: string;
}

export interface DemandeSejourPayload {
  prenom: string;
  nom: string;
  telephone: string;
  email?: string;
  dateArrivee: string;
  dateDepart: string;
  nombreVoyageurs: number;
  message?: string;
}

export interface DemandeSejourResultat {
  reference: string;
  nuits: number;
  prixNuit: number;
  fraisMenage: number;
  montantTotal: number;
  cautionMontant: number | null;
}
