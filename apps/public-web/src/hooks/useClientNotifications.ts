import { fetchNotifications } from '../api/notifications';
import { useAsyncData } from './useAsyncData';

/** Notifications du client connecté : les plus récentes d'abord, avec le nombre de non lues. */
export function useClientNotifications(token: string | null) {
  return useAsyncData(() => {
    if (!token) return Promise.reject(new Error('Session absente'));
    return fetchNotifications(token);
  }, [token]);
}
