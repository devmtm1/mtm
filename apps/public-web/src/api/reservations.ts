import { apiClient } from './client';
import type { ReservationRequestPayload, ReservationRequestResult } from '../types/reservation';

export function sendReservationRequest(
  payload: ReservationRequestPayload,
): Promise<ReservationRequestResult> {
  return apiClient.post<ReservationRequestResult>('/ventes/public/reservation-requests', payload);
}
