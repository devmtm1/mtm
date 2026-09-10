import { apiClient } from './client';
import type { ContactPayload, ContactResult } from '../types/contact';

export function sendContactMessage(payload: ContactPayload): Promise<ContactResult> {
  return apiClient.post<ContactResult>('/contacts', payload);
}
