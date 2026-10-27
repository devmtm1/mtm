import { apiClient } from './client';
import type { ConfierBienPayload, ContactPayload, ContactResult, DevisConstructionPayload } from '../types/contact';

export function sendContactMessage(payload: ContactPayload): Promise<ContactResult> {
  return apiClient.post<ContactResult>('/contacts', payload);
}

/** Un propriétaire propose un bien à la gestion : la demande rejoint les gestionnaires locatifs. */
export function sendConfierBien(payload: ConfierBienPayload): Promise<ContactResult> {
  return apiClient.post<ContactResult>('/contacts/confier-bien', payload);
}

/** Un visiteur demande un devis de construction : la demande rejoint l'équipe construction. */
export function sendDevisConstruction(payload: DevisConstructionPayload): Promise<ContactResult> {
  return apiClient.post<ContactResult>('/contacts/devis-construction', payload);
}
