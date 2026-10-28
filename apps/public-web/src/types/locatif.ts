/**
 * Espaces propriétaire et locataire (J2.1, sections 4 et 15 du cahier des
 * charges) : loyers appelés, encaissés, solde, relevés et documents pour le
 * propriétaire ; bail, quittances, paiements, caution, incidents et demandes
 * pour le locataire.
 */

export interface ClientBailResume {
  id: string;
  referenceInterne: string | null;
  loyerMensuel: number;
  charges: number | null;
  dateDebut: string;
  statut: string;
  /** a_jour | retard | impaye_prolonge, recalculé côté API. */
  situationPaiement: string;
  preavisDepartPrevu: string | null;
  locataire: string | null;
  loyersDus: number;
  loyersEncaisses: number;
  solde: number;
  echeancesImpayees: number;
}

export interface ClientBienLocatif {
  id: string;
  referenceInterne: string;
  type: string;
  adresse: string;
  commune: string | null;
  region: string | null;
  statut: string;
  /** longue_duree | courte_duree : en courte durée, il n'y a pas de bail mais des séjours. */
  modeLocation: string;
  /** Logement d'une propriété (villa, immeuble, résidence) : son numéro de lot et la propriété ; vides pour un bien seul. */
  numeroLot?: string | null;
  immeuble?: { id: string; nom: string; type: string } | null;
  /** Pour un bien en courte durée : occupe | reserve | libre (null au mois). */
  occupation: 'occupe' | 'reserve' | 'libre' | null;
  /** Séjours engagés : en cours et à venir d'abord, puis les plus récents. */
  sejours: ClientSejourResume[];
  /** Règlements reçus des voyageurs pour ce bien. */
  sejoursEncaisses: number;
  bail: ClientBailResume | null;
}

/** Un séjour vu du propriétaire : le voyageur n'est désigné que par son prénom et l'initiale de son nom. */
export interface ClientSejourResume {
  id: string;
  referenceInterne: string;
  /** confirmee | en_cours | terminee */
  statut: string;
  source: string;
  dateArrivee: string;
  dateDepart: string;
  nuits: number;
  voyageur: string;
  montantTotal: number;
  encaisse: number;
}

/** Synthèse du portefeuille du propriétaire (section 15 : loyers et solde). */
export interface ClientSyntheseProprietaire {
  biens: number;
  /** Biens sous bail, plus biens en courte durée occupés en ce moment. */
  loues: number;
  biensALaNuit: number;
  sejoursAVenir: number;
  sejoursEncaisses: number;
  loyersDus: number;
  loyersEncaisses: number;
  solde: number;
  echeancesImpayees: number;
}

export interface ClientDocumentLocatif {
  id: string;
  type: string;
  title: string | null;
  createdAt: string;
  secureUrl: string;
  bailLocatif: { bienLocatif: { referenceInterne: string; adresse: string } };
}

export interface ClientEcheanceLoyer {
  id: string;
  periode: string;
  dateEcheance: string;
  montantPrevu: number;
  montantPaye: number;
  statut: string;
}

/** Ce que le locataire doit encore, recalculé et jamais saisi (section 15). */
export interface ClientSoldeLocataire {
  loyersDus: number;
  loyersRegles: number;
  resteADevoir: number;
  enAttenteDeValidation: number;
}

export interface ClientMouvementCaution {
  id: string;
  type: string;
  montant: number;
  date: string;
  justification: string | null;
}

/** Caution du locataire : exigée par la section 4 dans son espace. */
export interface ClientCautionLocataire {
  montantPrevu: number;
  verse: number;
  retenu: number;
  rembourse: number;
  detenu: number;
  statut: string;
  mouvements: ClientMouvementCaution[];
}

/** en_attente : déposée, MTM ne l'a pas encore contrôlée ; valide ; rejete : refusée, avec son motif. */
export interface ClientAssurance {
  statut: 'en_attente' | 'valide' | 'rejete';
  dateExpiration: string | null;
  motifRejet: string | null;
  deposeLe: string;
  /** La date de fin de validité est passée : à renouveler. */
  expiree: boolean;
}

export interface ClientBailLocataire {
  id: string;
  referenceInterne: string | null;
  loyerMensuel: number;
  charges: number | null;
  jourEcheance: number;
  dateDebut: string;
  dateFin: string | null;
  statut: string;
  situationPaiement: string;
  preavisDonneLe: string | null;
  preavisDepartPrevu: string | null;
  dateSortieReelle: string | null;
  regularisationMontant: number | null;
  bien: {
    referenceInterne: string;
    adresse: string;
    commune: string | null;
    region: string | null;
    type: string;
  };
  solde: ClientSoldeLocataire;
  caution: ClientCautionLocataire;
  /** Attestation d'assurance habitation : la plus récente fait foi ; `null` tant qu'aucune n'a été déposée. */
  assurance?: ClientAssurance | null;
  echeances: ClientEcheanceLoyer[];
  documents: ClientDocumentLocatif[];
}

export interface ClientPaiementLoyer {
  id: string;
  type: string;
  montant: number;
  datePaiement: string;
  modePaiement: string;
  reference: string | null;
  /** en_attente | valide : un règlement reçu n'est acquis qu'après contrôle. */
  statut: string;
  bailLocatif: { referenceInterne: string | null };
}

export interface ClientIncidentLocatif {
  id: string;
  /** incident | demande (sections 4 et 15). */
  nature: string;
  type: string;
  description: string;
  statut: string;
  resolutionNotes: string | null;
  createdAt: string;
  resolvedAt: string | null;
  bailLocatif?: { id: string; referenceInterne: string | null };
}

/** Demande de résiliation de bail déposée par le locataire. */
export interface ClientResiliation {
  id: string;
  bailLocatifId: string;
  dateDemande: string;
  dateDepartSouhaitee: string;
  motif: string | null;
  message: string | null;
  /** en_attente | acceptee | refusee | annulee */
  statut: string;
  /** Départ confirmé par MTM une fois la demande acceptée. */
  dateDepartRetenue: string | null;
  reponse: string | null;
  traiteeLe: string | null;
}

export interface ClientResiliations {
  demandes: ClientResiliation[];
  /** Préavis habituel, en jours. */
  preavisJours: number;
}

export interface ClientResiliationPayload {
  dateDepartSouhaitee: string;
  motif?: string;
  message?: string;
}
