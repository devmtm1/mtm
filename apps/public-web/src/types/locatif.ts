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
  bail: ClientBailResume | null;
}

/** Synthèse du portefeuille du propriétaire (section 15 : loyers et solde). */
export interface ClientSyntheseProprietaire {
  biens: number;
  loues: number;
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
