import { fetchClientDemandes, fetchClientPortal } from '../api/clientPortal';
import { useAsyncData } from './useAsyncData';

export function useClientPortal(token: string | null) {
  return useAsyncData(() => {
    if (!token) return Promise.reject(new Error('Session absente'));
    return fetchClientPortal(token);
  }, [token]);
}

export function useClientDemandes(token: string | null) {
  return useAsyncData(() => {
    if (!token) return Promise.reject(new Error('Session absente'));
    return fetchClientDemandes(token);
  }, [token]);
}
