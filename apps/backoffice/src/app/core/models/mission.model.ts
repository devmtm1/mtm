/** Modèles des missions de vérification foncière (J2.2, section 14 CDC). */

export interface MissionProspect {
  id: string;
  nom: string;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
}

export interface MissionTerrain {
  id: string;
  nom: string;
  referenceInterne: string | null;
  commune: string | null;
  region: string | null;
}

export interface MissionPersonne {
  id: string;
  firstName: string | null;
  lastName: string | null;
}

/** Constat : visite sur site ou administration consultée. */
export interface EtapeMission {
  id: string;
  type: string;
  titre: string;
  observations: string | null;
  dateVisite: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  accesDescription: string | null;
  environnement: string | null;
  conformiteApparente: string | null;
  /** Négociateur, promoteur… présents sur le site, avec leur qualité. */
  personnesPresentes: string | null;
  administration: string | null;
  interlocuteur: string | null;
  resultat: string | null;
  realiseePar: MissionPersonne | null;
  realiseeLe: string;
}

export interface DocumentMission {
  id: string;
  /** Constat auquel la pièce se rattache, quand elle en a un. */
  etapeId: string | null;
  /** « image », « video » ou « raw » : ce qui distingue une photo d'un PDF. */
  resourceType: string;
  type: string;
  title: string | null;
  isGenerated: boolean;
  isPublic: boolean;
  version: number;
  createdAt: string;
  createdBy: MissionPersonne | null;
  /** Lien de téléchargement signé, valable deux heures. */
  secureUrl: string;
}

/** Collaborateur pouvant porter une mission. */
export interface MissionCollaborateur {
  id: string;
  firstName: string | null;
  lastName: string | null;
  roles: string[];
}

export interface MissionListItem {
  id: string;
  referenceInterne: string | null;
  typeVerification: string;
  objectif: string | null;
  localisation: string | null;
  region: string | null;
  commune: string | null;
  urgence: string;
  statut: string;
  decision: string | null;
  dateDemande: string;
  dateEcheance: string | null;
  dateRapport: string | null;
  montantDevis: number | string | null;
  montantPaye: number | string | null;
  prospect: MissionProspect;
  terrain: MissionTerrain | null;
  responsable: MissionPersonne | null;
  _count: { etapes: number; documents: number };
}

export interface MissionDetail extends MissionListItem {
  latitude: number | string | null;
  longitude: number | string | null;
  piecesFournies: string | null;
  budgetAnnonce: number | string | null;
  faisabiliteConclusion: string | null;
  faisabiliteNotes: string | null;
  fraisEtude: number | string | null;
  modePaiement: string | null;
  referencePaiement: string | null;
  /** Numéro de la facture (MTM-FAC-VF-001/2026), une fois émise. */
  factureReference: string | null;
  factureEmiseLe: string | null;
  conclusion: string | null;
  reserves: string | null;
  recommandation: string | null;
  visibleClient: boolean;
  createdBy: MissionPersonne | null;
  etapes: EtapeMission[];
  documents: DocumentMission[];
}

export interface MissionPage {
  items: MissionListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MissionQuery {
  search?: string;
  statut?: string;
  typeVerification?: string;
  urgence?: string;
  responsableId?: string;
  prospectId?: string;
  vue?: string;
  page?: number;
  pageSize?: number;
}

export interface MissionOptions {
  statuts: string[];
  typesVerification: string[];
  urgences: string[];
  conclusionsFaisabilite: string[];
  decisions: string[];
  conformites: string[];
  administrations: string[];
  resultatsAdministration: string[];
  typesDocument: string[];
  modesPaiement: string[];
  /** Tarif indicatif par type de vérification, en FCFA. */
  tarifs: Record<string, number>;
  /**
   * Famille de parcours de chaque type de prestation : « verification »,
   * « demarche » ou « technique ». Une vérification foncière et un dépôt de
   * bail ne franchissent pas les mêmes étapes.
   */
  famillesParType: Record<string, string>;
  /** Étapes praticables par famille, fins de parcours comprises. */
  parcoursParFamille: Record<string, string[]>;
}

export interface MissionStats {
  total: number;
  aPlanifier: number;
  enCours: number;
  enRetard: number;
  sansResponsable: number;
  cloturees: number;
  abandonnees: number;
  montantDevis: number;
  montantEncaisse: number;
  tauxAboutissement: number;
  parEtape: Record<string, number>;
}

export interface CreateMissionPayload {
  prospectId: string;
  terrainId?: string;
  typeVerification: string;
  objectif?: string;
  localisation?: string;
  region?: string;
  commune?: string;
  latitude?: number;
  longitude?: number;
  piecesFournies?: string;
  urgence?: string;
  budgetAnnonce?: number;
  dateEcheance?: string;
  responsableId?: string;
}

export type UpdateMissionPayload = Partial<
  Omit<CreateMissionPayload, 'prospectId'>
> & {
  faisabiliteConclusion?: string;
  faisabiliteNotes?: string;
  montantDevis?: number;
  fraisEtude?: number;
  decision?: string;
  conclusion?: string;
  reserves?: string;
  recommandation?: string;
  visibleClient?: boolean;
};

export interface EtapeMissionPayload {
  type: string;
  titre: string;
  observations?: string;
  dateVisite?: string;
  latitude?: number;
  longitude?: number;
  accesDescription?: string;
  environnement?: string;
  conformiteApparente?: string;
  personnesPresentes?: string;
  administration?: string;
  interlocuteur?: string;
  resultat?: string;
  realiseeLe?: string;
}

/** Règlement reçu pour une mission (acompte, solde, transfert Wave…). */
export interface PaiementMission {
  id: string;
  datePaiement: string;
  /** Montant envoyé par le client : c'est lui qui s'impute sur le prix. */
  montantEnvoye: number | string;
  /** Frais de transfert, distincts du prix de la prestation. */
  frais: number | string;
  montantNet: number | string;
  mode: string;
  reference: string | null;
  note: string | null;
  createdBy: MissionPersonne | null;
}

export type StatutReglement = 'a_facturer' | 'non_regle' | 'partiel' | 'solde' | 'trop_percu';

export interface SyntheseReglement {
  montantConvenu: number | null;
  totalEnvoye: number;
  totalFrais: number;
  totalNet: number;
  solde: number | null;
  excedent: number;
  statut: StatutReglement;
}

export interface ReglementsMission {
  paiements: PaiementMission[];
  synthese: SyntheseReglement;
}

export interface PaiementMissionPayload {
  datePaiement?: string;
  montantEnvoye: number;
  frais?: number;
  mode: string;
  reference?: string;
  note?: string;
}
