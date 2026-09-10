export interface ReservationRequestPayload {
  terrainId: string;
  nom: string;
  email: string;
  telephone?: string;
  message?: string;
}

export interface ReservationRequestResult {
  id: string;
  statut: string;
  createdAt: string;
}
