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
