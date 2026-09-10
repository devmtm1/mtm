import { fetchClientPortal } from '../api/clientPortal';
import { useAsyncData } from './useAsyncData';

export function useClientPortal(token: string | null) {
  return useAsyncData(() => {
    if (!token) return Promise.reject(new Error('Session absente'));
    return fetchClientPortal(token);
  }, [token]);
}
