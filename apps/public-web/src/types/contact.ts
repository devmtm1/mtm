export interface ContactPayload {
  nom: string;
  email: string;
  telephone?: string;
  sujet?: string;
  message: string;
  terrainId?: string;
  /** Annonce de location d'où part la demande. */
  bienLocatifId?: string;
}

export interface ContactResult {
  success: true;
}
