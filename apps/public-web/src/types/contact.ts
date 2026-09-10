export interface ContactPayload {
  nom: string;
  email: string;
  telephone?: string;
  sujet?: string;
  message: string;
  terrainId?: string;
}

export interface ContactResult {
  success: true;
}
