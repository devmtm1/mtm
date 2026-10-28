import { apiClient } from './client';
import type { ClientNotifications } from '../types/notification';

export function fetchNotifications(token: string): Promise<ClientNotifications> {
  return apiClient.get<ClientNotifications>('/notifications', { limite: 50 }, { token });
}

export function markNotificationRead(token: string, id: string): Promise<{ marquees: number }> {
  return apiClient.post(`/notifications/${id}/read`, undefined, { token });
}

export function markAllNotificationsRead(token: string): Promise<{ marquees: number }> {
  return apiClient.post('/notifications/read-all', undefined, { token });
}

/** Numéro et canaux de notification de la personne connectée ; `canaux` dit lesquels MTM a activés (SMS, WhatsApp). */
export interface PreferencesClient {
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
  telephone: string;
  canaux: { email: boolean; sms: boolean; whatsapp: boolean };
}

export function fetchPreferences(token: string): Promise<PreferencesClient> {
  return apiClient.get<PreferencesClient>('/notifications/preferences', undefined, { token });
}

export function savePreferences(
  token: string,
  preferences: { telephone: string; email: boolean; sms: boolean; whatsapp: boolean },
): Promise<PreferencesClient> {
  return apiClient.put<PreferencesClient>('/notifications/preferences', preferences, { token });
}
